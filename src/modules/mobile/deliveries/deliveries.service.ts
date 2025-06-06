import { InjectRepository } from "@nestjs/typeorm";
import { ActiveDeliveryAsClient, DeliveryDetails, InvoiceDetails } from "./type";
import { Users } from "src/common/entities/user.entity";
import { In, Repository } from "typeorm";
import { Shipment } from "src/common/entities/shipment.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { StripeService } from "src/common/services/stripe/stripe.service";
import { PdfService } from "src/common/services/pdf/pdf.service";
import { Inject } from "@nestjs/common";
import { Subscription } from "src/common/entities/subscription.entity";
import * as nodemailer from "nodemailer";
import { Readable } from "stream";
import { DeliveryTransfer } from "src/common/entities/delivery_transfer.entity";


export class DeliveriesService {

        constructor(
            @InjectRepository(Users)
            private readonly userRepository: Repository<Users>,
            @InjectRepository(Shipment)
            private readonly shipmentRepository: Repository<Shipment>,
            @InjectRepository(Delivery)
            private readonly deliveryRepository: Repository<Delivery>,
            @InjectRepository(Subscription)
            private readonly subscriptionRepository: Repository<Subscription>,
            @InjectRepository(DeliveryTransfer)
            private readonly deliveryTransferRepository: Repository<DeliveryTransfer>,
            @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
            
            private readonly minioService : MinioService,
            private readonly stripeService: StripeService,
            private readonly pdfService : PdfService,

        ){
    }

    async getActiveDeliveries(user_id: string): Promise<ActiveDeliveryAsClient[]> {
        const user = await this.userRepository.findOne({
                    where: { user_id },
                    relations: ['clients'],
                });
            
                if (!user) {
                    throw new Error('User not found.');
                }
            
                const shipments = await this.shipmentRepository.find({
                    where: {
                        user: { user_id: user.user_id },
                    },
                    relations: ['stores', 'stores.exchangePoint'],
                });
            
                const deliveriesPromises = shipments.map(async (shipment) => {
                    const deliveries = await this.deliveryRepository.find({
                        where: {
                            shipment: { shipment_id: shipment.shipment_id },
                            status: In(['pending', 'taken', 'finished']),
                        },
                        relations: ['delivery_person', 'delivery_person.user', 'delivery_person.user.clients'],
                    });
            
                    return Promise.all(deliveries.map(async (delivery) => {
                        const deliveryPersonUser = delivery.delivery_person?.user;
                        const deliveryPersonClient = deliveryPersonUser?.clients[0];
            
                        const profilePicture = deliveryPersonUser?.profile_picture
                            ? await this.minioService.generateImageUrl("client-images", deliveryPersonUser.profile_picture)
                            : '';
        
                        const deliveryPicture = shipment.image ? await this.minioService.generateImageUrl("client-images", shipment.image) : '';
            
                        return {
                            id: delivery.delivery_id,
                            arrival_city: shipment.arrival_city ?? '',
                            departure_city: shipment.departure_city ?? '',
                            date_departure: shipment.deadline_date?.toISOString().split('T')[0] || '',
                            date_arrival: shipment.deadline_date?.toISOString().split('T')[0] || '',
                            photo: deliveryPicture,
                            deliveryman: deliveryPersonClient ? {
                                name: `${deliveryPersonClient.first_name} ${deliveryPersonClient.last_name}`,
                                photo: profilePicture,
                            } : {
                                name: 'Unknown',
                                photo: '',
                            },
                        };
                    }));
                });
            
                const deliveries = (await Promise.all(deliveriesPromises)).flat();
            
                return deliveries;
    }

    async getDeliveryDetails(user_id: string, delivery_id: string): Promise<DeliveryDetails> {
            const delivery = await this.deliveryRepository.findOne({
                where: { delivery_id },
                relations: [
                    'delivery_person',
                    'delivery_person.user',
                    'shipment',
                    'shipment.user',
                    'shipment.stores',
                    'shipment.stores.exchangePoint',
                    'shipment.parcels',
                    'shipment.parcels.images',
                ],
            });
        
            if (!delivery) {
                throw new Error('Delivery not found.');
            }
        
            const shipment = delivery.shipment;
            if (!shipment || !shipment.user) {
                throw new Error('Shipment or associated user not found.');
            }
        
            const isOwner = shipment.user.user_id === user_id;
            const isDeliveryPerson = delivery.delivery_person?.user?.user_id === user_id;
        
            if (!isOwner && !isDeliveryPerson) {
                throw new Error('Unauthorized access to delivery details.');
            }
        
            const storesByStep = (shipment.stores || []).sort((a, b) => a.step - b.step);
        
            let departureCity: string | undefined;
            let departureCoords: [number, number] | undefined;
            let arrivalCity: string | undefined;
            let arrivalCoords: [number, number] | undefined;
        
            const step = delivery.shipment_step;
        
            if (step === 0) {
                departureCity = shipment.departure_city || "";
                departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [number, number];
            
                arrivalCity = storesByStep[0]?.exchangePoint?.city ?? shipment.arrival_city;
                arrivalCoords = storesByStep[0]?.exchangePoint?.coordinates.coordinates?.slice().reverse()
                    ?? shipment.arrival_location?.coordinates?.slice().reverse();
            } else if (step === 1000) {
                const lastStore = storesByStep.find(s => s.step === step - 1);
                departureCity = lastStore?.exchangePoint?.city ?? shipment.departure_city ?? undefined;
                departureCoords = lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse()
                    ?? shipment.departure_location?.coordinates?.slice().reverse();
            
                arrivalCity = shipment.arrival_city ?? undefined;
                arrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse();
            } else {
                const prevStore = storesByStep.find(s => s.step === step - 1);
                const currStore = storesByStep.find(s => s.step === step);
            
                if (!prevStore) {
                    departureCity = shipment.departure_city ?? undefined;
                    departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [number, number];
                } else {
                    departureCity = prevStore.exchangePoint?.city;
                    departureCoords = prevStore.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number];
                }
            
                arrivalCity = currStore?.exchangePoint?.city;
                arrivalCoords = currStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number];
            }
        
            const deliveryDetails: DeliveryDetails = {
                departure: {
                    city: departureCity || '',
                    coordinates: departureCoords ?? [0, 0],
                },
                arrival: {
                    city: arrivalCity || '',
                    coordinates: arrivalCoords ?? [0, 0],
                },
                departure_date: delivery.send_date?.toISOString().split('T')[0] || '',
                arrival_date: delivery.delivery_date?.toISOString().split('T')[0] || '',
                status: (['pending', 'taken', 'finished', 'validated'].includes(delivery.status)
                    ? delivery.status
                    : 'pending') as 'pending' | 'taken' | 'finished' | 'validated',
                total_price: Number(delivery.delivery_price ?? delivery.amount),
                cart_dropped: shipment.trolleydrop,
                packages: await Promise.all(
                    (shipment.parcels || []).map(async (parcel: any) => ({
                        id: parcel.parcel_id,
                        name: parcel.name,
                        fragility: parcel.fragility,
                        estimated_price: Number(parcel.estimate_price),
                        weight: Number(parcel.weight),
                        volume: Number(parcel.volume),
                        picture: await Promise.all(
                            (parcel.images || []).map((img: any) =>
                                this.minioService.generateImageUrl("client-images", img.image_url)
                            )
                        ),
                    }))
                ),
            };
        
            return deliveryDetails;
        }

    async takeDeliveryPackage(deliveryId: string, user_id: string, nfc: string): Promise<{ message: string }> {
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

        if (delivery.shipment.user.user_id !== user_id) {
            throw new Error("User is not authorized to take this delivery.");
        }

        if (["finished", "validated"].includes(delivery.status)) {
            throw new Error(`Cannot take a delivery with status '${delivery.status}'.`);
        }

        const deliveryPerson = delivery.delivery_person;

        if (nfc && deliveryPerson.nfc_code !== nfc) {
            throw new Error("Invalid NFC code for this delivery person.");
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
            await this.minioService.uploadFileToBucket('client-documents', filePath, file);


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

}