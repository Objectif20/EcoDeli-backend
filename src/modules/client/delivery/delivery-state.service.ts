import { Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Delivery } from "src/common/entities/delivery.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { PdfService } from "src/common/services/pdf/pdf.service";
import { StripeService } from "src/common/services/stripe/stripe.service";
import { Repository } from "typeorm";
import * as nodemailer from "nodemailer";
import { Shipment } from "src/common/entities/shipment.entity";
import { DeliveryTransfer } from "src/common/entities/delivery_transfer.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Users } from "src/common/entities/user.entity";
import { Subscription } from "src/common/entities/subscription.entity";
import { InvoiceDetails } from "src/common/services/pdf/type";
import { Readable } from "stream";

export class DeliveryStateService {

    constructor(
        @InjectRepository(Delivery)
        private readonly deliveryRepository: Repository<Delivery>,

        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,

        @InjectRepository(DeliveryTransfer)
        private readonly deliveryTransferRepository: Repository<DeliveryTransfer>,

        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,

        @InjectRepository(Users)
        private readonly userRepository: Repository<Users>,

        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,

        @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
        private readonly pdfService: PdfService,
        private readonly stripeService : StripeService,
        private readonly minioService: MinioService,
    ) {
    }


        // Si livraison prioritaire, on applique sur la somme de cette livraison + le prix restant dans shipment
        // Si mois de priorité, checker date de création abonnement pour appliquer (si oui on déduit tous les frais de livraison)
        // On check le max de l'assurance qui protège, sinon on applique le prix d'assurance en plus si on dépasse le prix 
        // On check si y'a une réduction sur le prix de la livraison (EcoDeli prend le pourcentage à sa charge)
        // On check la réduction permanente disponible
        // Si on considère la livraison comme des petits colis alors on applique la réduction
        // Si la première livraison est gratuite, on check si déjà utilisée (si non on l'appliquer et on met à jour dans la bdd)
        // Après les mois offerts de frais, on check aussi si on est en première livraison en respectant le seuil max

        // On ajoute les frais de stripe : 1.5% + 0.25€ à ajouté pour la prise en compte de Stripe (dans tous les cas de chaque livraison)

        /* 
            Ordre de calcul : 

            - Check si des mois offerts et combien 
            - Check si encore dans les mois offerts -> Si oui skip : juste à payer envoi prioritaire + stripe
            - Check si une livraison offerte et quel prix pour l'obtenir (si les mois sont finis)
            - On check le prix de courverture de l'assurance (si on dépasse, on ajoute le prix de l'assurance)
            - On déduit les différentes réductions 
            - On check si on est dans les petits colis (si oui on applique la réduction)


            - On prend la valeur totale et on ajoute x*1.5% + O,25€ pour la prise en charge de stripe
        */

        async takeDeliveryPackage(deliveryId: string, user_id: string, secretCode: string): Promise<{ message: string }> {
            const delivery = await this.deliveryRepository.findOne({
                where: { delivery_id: deliveryId },
                relations: [
                    "delivery_person",
                    "shipment",
                    "delivery_person.user",
                    "shipment.stores",
                    "shipment.stores.exchangePoint",
                    "shipment.user",
                ],
            });
    
            if (!delivery) {
                throw new Error("Delivery not found.");
            }
    
            if (delivery.delivery_person.user.user_id !== user_id) {
                throw new Error("User is not authorized to take this delivery.");
            }
    
            if (["finished", "validated"].includes(delivery.status)) {
                throw new Error(`Cannot take a delivery with status '${delivery.status}'.`);
            }
    
            if (delivery.delivery_code !== secretCode) {
                throw new Error("Invalid secret code.");
            }
    
            let totalPrice = Number(delivery.amount);
    
            const isMainStep = delivery.shipment_step === 0 || delivery.shipment_step === 1;
    
            let stripeIntentId : string | null = null;
    
            if (isMainStep) {
                const user = await this.userRepository.findOne({
                    where: { user_id: delivery.shipment.user.user_id },
                    relations: ["clients", "merchant", "subscriptions", "subscriptions.plan"],
                });
    
                if (!user?.subscriptions || user.subscriptions.length === 0) {
                    throw new Error("User has no active subscription.");
                }
    
                const subscription = user.subscriptions[0];
                const plan = subscription.plan;
    
                console.log("Total Price after initialization:", totalPrice);
    
                if (plan.priority_months_offered > 0) {
                    const now = new Date();
                    const startDate = new Date(subscription.start_date);
                    const endDate = new Date(startDate);
                    endDate.setMonth(startDate.getMonth() + plan.priority_months_offered);
    
                    if (now <= endDate) {
                        const priorityFee = (plan.priority_shipping_percentage / 100) * totalPrice;
                        totalPrice += priorityFee;
                        console.log("Total Price after priority shipping adjustment:", totalPrice);
                    }
                }
    
                if (
                    plan.first_shipping_free &&
                    !subscription.first_shipping_free_taken &&
                    totalPrice <= plan.first_shipping_free_threshold
                ) {
                    totalPrice = 0;
                    console.log("Total Price after first shipping free adjustment:", totalPrice);
                    subscription.first_shipping_free_taken = true;
                    await this.subscriptionRepository.save(subscription);
                }
    
                console.log("Total Price after first shipping free check:", totalPrice);
    
                if (delivery.amount > plan.max_insurance_coverage) {
                    totalPrice += Number(plan.extra_insurance_price) ?? 0;
                    console.log("Total Price after extra insurance adjustment:", totalPrice);
                }
    
                totalPrice -= plan.shipping_discount ?? 0;
                console.log("Total Price after shipping discount adjustment:", totalPrice);
    
                totalPrice -= plan.permanent_discount ?? 0;
                console.log("Total Price after permanent discount adjustment:", totalPrice);
    
                totalPrice -= plan.small_package_permanent_discount ?? 0;
                console.log("Total Price after small package discount adjustment:", totalPrice);
    
                if (totalPrice > 0) {
                    const fee = totalPrice * 0.015 + 0.25;
                    totalPrice += fee;
                    console.log("Total Price after final fee adjustment:", totalPrice);
                }
    
                if (totalPrice < 0) {
                    throw new Error("Invalid delivery: total price is negative.");
                }
    
                if (totalPrice > 0 && totalPrice < 1) {
                    console.log(`Total price ${totalPrice} is less than 1. Rounding to 1.00.`);
                    totalPrice = 1.00;
                }
    
                if (totalPrice > 0) {
                    const stripeCustomerId =
                        user.clients?.[0]?.stripe_customer_id ?? user.merchant?.stripe_customer_id;
    
                    if (!stripeCustomerId) {
                        throw new Error("Stripe customer ID not found for user.");
                    }
    
                    console.log("Stripe Customer ID:", stripeCustomerId);
                    console.log("Final Total Price:", totalPrice);
                    console.log("Delivery ID:", deliveryId);
    
                    const { stripePaymentIntentId } = await this.stripeService.chargeCustomer(
                        stripeCustomerId,
                        Math.round(totalPrice * 100),
                        `Delivery for shipment ${delivery.shipment.shipment_id} : ${delivery.shipment.description}`,
                    );
                    stripeIntentId = stripePaymentIntentId;
                } else {
                    console.log("No charge needed. Delivery total is zero.");
                }
    
                if (subscription.first_shipping_free_taken) {
                    subscription.first_shipping_free_taken = false;
                    await this.subscriptionRepository.save(subscription);
                }
    
            } else {
    
                if (totalPrice < 0) {
                    throw new Error("Invalid delivery: total price is negative.");
                }
    
                if (totalPrice > 0) {
                    const fee = totalPrice * 0.015 + 0.25;
                    totalPrice += fee;
    
                    const user = await this.userRepository.findOne({
                        where: { user_id: delivery.shipment.user.user_id },
                        relations: ["clients", "merchant"],
                    });
    
                    const stripeCustomerId =
                        user?.clients?.[0]?.stripe_customer_id ?? user?.merchant?.stripe_customer_id;
    
                    if (!stripeCustomerId) {
                        throw new Error("Stripe customer ID not found for user.");
                    }
    
                    const { stripePaymentIntentId } = await this.stripeService.chargeCustomer(
                        stripeCustomerId,
                        Math.round(totalPrice * 100),
                        `Delivery for shipment ${delivery.shipment.shipment_id} : ${delivery.shipment.description}`,
                    );
                    stripeIntentId = stripePaymentIntentId;
    
                }
            }
    
            let customerName = "";
            if (delivery.shipment.user.clients?.length > 0) {
                customerName = `${delivery.shipment.user.clients[0].first_name} ${delivery.shipment.user.clients[0].last_name}`;
            } else if (delivery.shipment.user.merchant) {
                customerName = `${delivery.shipment.user.merchant.first_name} ${delivery.shipment.user.merchant.last_name}`;
            }
    
            let deliveryPersonName = "";
            if (delivery.delivery_person.user.clients?.length > 0) {
                deliveryPersonName = `${delivery.delivery_person.user.clients[0].first_name} ${delivery.delivery_person.user.clients[0].last_name}`;
            }
    
            let departureCity = "";
            if (delivery.shipment.stores?.length > 0 && delivery.shipment.stores[0]?.exchangePoint?.city) {
                departureCity = delivery.shipment.stores[0].exchangePoint.city;
            } else if (delivery.shipment.departure_city) {
                departureCity = delivery.shipment.departure_city;
            } else if (delivery.shipment.departure_location?.coordinates) {
                departureCity = `${delivery.shipment.departure_location.coordinates[1]}, ${delivery.shipment.departure_location.coordinates[0]}`; // lat, long
            } else {
                departureCity = "Ville de départ inconnue";
            }
    
            let arrivalCity = "";
            if (delivery.shipment.stores?.length > 1 && delivery.shipment.stores[1]?.exchangePoint?.city) {
                arrivalCity = delivery.shipment.stores[1].exchangePoint.city;
            } else if (delivery.shipment.arrival_city) {
                arrivalCity = delivery.shipment.arrival_city;
            } else if (delivery.shipment.arrival_location?.coordinates) {
                arrivalCity = `${delivery.shipment.arrival_location.coordinates[1]}, ${delivery.shipment.arrival_location.coordinates[0]}`; // lat, long
            } else {
                arrivalCity = "Ville d’arrivée inconnue";
            }
    
            const invoiceDetails: InvoiceDetails = {
                invoiceNumber: `INV-${delivery.delivery_id}`,
                invoiceDate: new Date().toISOString().split('T')[0],
                customerName: customerName,
                customerEmail: delivery.shipment.user.email,
                deliveryId: delivery.delivery_id,
                shipmentDescription: delivery.shipment.description || "No description",
                deliveryCode: delivery.delivery_code,
                deliveryDate: "A venir",
                departureCity: departureCity,
                arrivalCity: arrivalCity,
                deliveryPersonName: deliveryPersonName,
                deliveryPersonPhone: delivery.delivery_person.phone_number,
                stripeIntentId: stripeIntentId,
                lineItems: [
                    { label: 'Montant de la livraison', value: Number(delivery.amount) },
                ],
                totalAmount: totalPrice,
                isMainStep: isMainStep,
            };
    
            const pdfBuffer = await this.pdfService.generateInvoicePdf(invoiceDetails);
            const fromEmail = this.mailer.options.auth.user;
            await this.mailer.sendMail({
                from: fromEmail,
                to: delivery.shipment.user.email,
                subject: 'Votre Facture de Livraison',
                text: 'Veuillez trouver ci-joint votre facture de livraison.',
                attachments: [
                    {
                        filename: `facture_${delivery.delivery_id}.pdf`,
                        content: pdfBuffer,
                    },
                ],
            });
    
            const file: Express.Multer.File = {
                fieldname: 'file',
                originalname: `facture_${delivery.delivery_id}.pdf`,
                encoding: '7bit',
                mimetype: 'application/pdf',
                buffer: pdfBuffer,
                size: pdfBuffer.length,
                destination: '', 
                filename: `facture_${delivery.delivery_id}.pdf`,
                path: '', 
                stream: Readable.from(pdfBuffer),
                };
    
                const filePath = `/shipments/${delivery.shipment.shipment_id}/delivery/${delivery.delivery_id}/facture_${delivery.delivery_id}.pdf`;
                await this.minioService.uploadFileToBucket('client-images', filePath, file);
    
    
            const deliveryTranser = this.deliveryTransferRepository.create({
                date: new Date(),
                amount: totalPrice,
                delivery: delivery,
                type: 'auto',
                stripe_id: stripeIntentId ?? undefined,
                url: filePath,
            });
            await this.deliveryTransferRepository.save(deliveryTranser);
    
    
            delivery.status = "taken";
            await this.deliveryRepository.save(delivery);
    
            if (delivery.shipment_step == 0 || delivery.shipment_step == 1000) {
    
                const recipientEmail = delivery.shipment.delivery_mail;
    
                await this.mailer.sendMail({
                    from: fromEmail,
                    to: recipientEmail,
                    subject: 'Votre livraison est en route',
                    text: `Bonjour,\n\nLa personne en charge de vous apporter le colis "${delivery.shipment.description}" est en route vers vous. Lorsque cette personne vous remettra le colis, il vous faudra lui fournir un code qui vous sera envoyé par email.\n\nMerci de votre confiance !\n\nCordialement,\nL'équipe EcoDeli`,
                });
    
            }
    
            return { message: "Delivery taken successfully." };
        }
    
        async finishDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {
            const delivery = await this.deliveryRepository.findOne({
                where: { delivery_id: deliveryId },
                relations: ["delivery_person", "shipment", "shipment.stores", "shipment.stores.exchangePoint", "delivery_person.user"],
            });
        
            if (!delivery) {
                throw new Error("Delivery not found.");
            }
        
            if (delivery.status != 'taken') {
                throw new Error("Delivery is not in a state that allows it to be finished.");
            }
        
            if (delivery.delivery_person.user.user_id !== user_id) {
                throw new Error("User is not authorized to finish this delivery.");
            }
        
            delivery.status = 'finished';    
            const secretCode = Math.floor(100000 + Math.random() * 900000).toString();
            delivery.end_code = secretCode;
        
            await this.deliveryRepository.save(delivery);
        
            const currentStep = delivery.shipment_step;
            const currentStore = delivery.shipment.stores.find(store => store.step === currentStep);
        
            if (currentStep === 0 || currentStep === 1000) {
                console.log(`Email to: ${delivery.shipment.delivery_mail}, Code: ${secretCode}`);
            } else if (currentStore) {
                if (currentStore.exchangePoint.warehouse_id) {
                    console.log(`Email to: ecodeli@gmail.com, Code: ${secretCode}`);
                } else if (currentStore.exchangePoint.isbox) {
                    console.log(`Code for box: ${secretCode}`);
                } else {
                    const nextStepStore = delivery.shipment.stores.find(store => store.step === currentStep + 1);
                    if (nextStepStore) {
                        const nextDelivery = await this.deliveryRepository.findOne({
                            where: { shipment: { shipment_id: delivery.shipment.shipment_id }, shipment_step: currentStep + 1 },
                            relations: ["delivery_person"]
                        });
                        if (nextDelivery) {
                            console.log(`Code sent to delivery person of next step: ${nextDelivery.delivery_person.professional_email}, Code: ${secretCode}`);
                        } else {
                            console.log(`Code: ${secretCode}`);
                            console.log(`Email to: personne`);
                        }
                    } else {
                        console.log(`Code: ${secretCode}`);
                        console.log(`Email to: personne`);
                    }
                }
            } else {
                console.log(`Code: ${secretCode}`);
                console.log(`Email to: personne`);
            }
        
            return { message: "Delivery finished successfully." };
        }
    
        async validateDeliveryWithCode(deliveryId: string, user_id: string, code: string): Promise<{ message: string }> {
    
            const delivery = await this.deliveryRepository.findOne({
                where: { delivery_id: deliveryId },
                relations: ["delivery_person", "shipment", "shipment.stores", "shipment.stores.exchangePoint", "delivery_person.user", "shipment.user", "shipment.user.clients"],
            });
        
            if (!delivery) {
                throw new Error("Delivery not found.");
            }
        
            if (delivery.status != 'finished') {
                throw new Error("Delivery is not in a state that allows it to be validated.");
            }
        
            if (delivery.end_code !== code) {
                throw new Error("Invalid code.");
            }
        
            if (delivery.delivery_person.user.user_id !== user_id) {
                throw new Error("User is not authorized to validate this delivery.");
            }
        
            delivery.status = 'validated';
            await this.deliveryRepository.save(delivery);
        
            const delivery_step = delivery.shipment_step;
        
            if (delivery_step === 0 || delivery_step === 1000) {
                await this.shipmentRepository.update(delivery.shipment.shipment_id, {
                    status: 'validated',
                });
            }
            const promisedPrice = Number(delivery.amount);
    
            const deliveryPerson = await this.deliveryPersonRepository.findOne({
                where: { delivery_person_id: delivery.delivery_person.delivery_person_id },
                relations: ['user', 'user.clients'],
            });
            if (!deliveryPerson) {
                throw new Error("Delivery person not found.");
            }
            deliveryPerson.balance = Number(deliveryPerson.balance) || 0;
            deliveryPerson.balance += promisedPrice;
            console.log(`Updating delivery person balance: ${deliveryPerson.balance}`);
            await this.deliveryPersonRepository.save(deliveryPerson);
    
            const fromEmail = this.mailer.options.auth.user;
            await this.mailer.sendMail({
                from: fromEmail,
                to: deliveryPerson.user.email,
                subject: 'Livraison Validée',
                text: `Bonjour ${deliveryPerson.user?.clients[0]?.first_name},\n\nVotre livraison a été validée avec succès. Vous avez reçu un montant de ${promisedPrice} € sur votre compte.\n\nMerci pour votre service !\n\nCordialement,\nL'équipe EcoDeli`,
            });
    
            const clientEmail = delivery.shipment.user.email;
            const clientName = delivery.shipment.user.clients?.[0]?.first_name || "Client";
            await this.mailer.sendMail({
                from: fromEmail,
                to: clientEmail,
                subject: 'Livraison Validée',
                text: `Bonjour ${clientName},\n\nVotre livraison a été validée avec succès par le livreur. Merci de votre confiance !\n\nCordialement,\nL'équipe EcoDeli`,
            });
    
            return { message: "Delivery validated successfully." };
        }
    
        async validateDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {
    
            const delivery = await this.deliveryRepository.findOne({
                where: { delivery_id: deliveryId },
                relations: ["delivery_person", "shipment"],
            });
    
            if (!delivery) {
                throw new Error("Delivery not found.");
            }
    
            if (delivery.status != 'finished'){
                throw new Error("Delivery is not in a state that allows it to be validated.");
            }
    
            if (delivery.shipment.user.user_id !== user_id) {
                throw new Error("User is not authorized to validate this delivery.");
            }
    
            delivery.status = 'validated';
            await this.deliveryRepository.save(delivery);
    
            const delivery_step = delivery.shipment_step;
    
            if (delivery_step === 0 || delivery_step === 1000) {
                await this.shipmentRepository.update(delivery.shipment.shipment_id, {
                    status: 'validated',
                });
            }
            
            return { message: "Delivery validated successfully." };
        }



}