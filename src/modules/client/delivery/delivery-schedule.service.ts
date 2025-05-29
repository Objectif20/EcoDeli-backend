import { Inject, Injectable } from "@nestjs/common";
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { Delivery } from "src/common/entities/delivery.entity";
import { BoxService } from "src/common/services/dataset/boxes.service";
import { Repository } from "typeorm";
import * as nodemailer from 'nodemailer';
import { ExchangePoint } from "src/common/entities/exchange_points.entity";

@Injectable()
export class DeliveryScheduleService {

    constructor(
        @InjectRepository(Delivery)
        private readonly deliveryRepository: Repository<Delivery>,
        @InjectRepository(ExchangePoint)
        private readonly exchangePointRepository: Repository<ExchangePoint>,
        private readonly boxService: BoxService,
        @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
        
    ){}

        @Cron('0 19 * * *')
        async handleCheckIncompleteDeliveries() {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const start = new Date(tomorrow.setHours(0, 0, 0, 0));
            const end = new Date(tomorrow.setHours(23, 59, 59, 999));

            const fromEmail = this.mailer.options.auth.user;


            const deliveries = await this.deliveryRepository
                    .createQueryBuilder('delivery')
                    .innerJoinAndSelect('delivery.shipment', 'shipment')
                    .leftJoinAndSelect('shipment.stores', 'store')
                    .leftJoin('shipment.deliveries', 'next_step', 
                        'next_step.shipment_step = delivery.shipment_step + 1')
                    .leftJoin('store.exchangePoint', 'exchangePoint')
                    .leftJoinAndSelect('delivery.delivery_person', 'delivery_person')
                    .leftJoinAndSelect('delivery_person.user', 'user')
                    .innerJoinAndSelect('user.clients', 'client')
                    .where('delivery.shipment_step BETWEEN 1 AND 9999')
                    .andWhere('delivery.send_date BETWEEN :start AND :end', { start, end })
                    .andWhere('next_step.delivery_id IS NULL')
                    .andWhere(
                        '(exchangePoint.exchange_point_id IS NULL OR (exchangePoint.isbox = false AND exchangePoint.warehouse_id IS NULL))'
                    )
                    .getMany();

            console.log('Deliveries with no next step:', deliveries);

            for (const delivery of deliveries) {
                const store = delivery.shipment.stores.find(s => s.step === delivery.shipment_step);
                let [lon, lat] = [0, 0];
                if (store?.exchangePoint?.coordinates?.coordinates) {
                    [lon, lat] = store.exchangePoint.coordinates.coordinates;
                    console.log(`Delivery ${delivery.delivery_id} coordinates: lat=${lat}, lon=${lon}`);
                } else {
                    console.log(`Delivery ${delivery.delivery_id}: No valid exchange point coordinates found.`);
                }

                if (lon !== 0 && lat !== 0) {
                    const closestBox = this.boxService.findNearestBox(lat, lon);
                    if (closestBox) {
                        console.log(`Closest box for delivery ${delivery.delivery_id}:`, closestBox);

                        let display_name: string | undefined;
                        let city : string | undefined;
                        let address : string | undefined;
                        let postal_code : string | undefined;

                        try {
                            const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                                params: {
                                    format: 'json',
                                    lat,
                                    lon,
                                },
                                headers: {
                                    'User-Agent': 'EcoDeli/1.0 (contact.ecodeli@gmail.com)',
                                },
                            });

                            const data = response.data;

                            if (data) {
                                display_name = data.display_name;
                                city = data.address?.city || data.address?.town || data.address?.village || data.address?.hamlet || "Ville non disponible";
                                address = data.address?.road || data.address?.residential || "Adresse non disponible";
                                postal_code = data.address?.postcode || "Code postal non disponible";
                            }

                            console.log('Adresse récupérée depuis Nominatim:', display_name);
                        } catch (error) {
                            console.error('Erreur lors de la récupération de l’adresse depuis Nominatim:', error);
                        }

                        const dp = delivery.delivery_person;
                        const user = dp?.user;
                        const client = user?.clients?.[0];

                        if (user && client) {
                            
                            await this.mailer.sendEmail({
                                from: fromEmail,
                                to: user.email,
                                subject: "Aucune réception prévue – Dépôt en boîte recommandé",
                                text:
                                    `Bonjour ${client.first_name} ${client.last_name},\n\n` +
                                    `Nous vous informons qu'aucune personne ne sera présente demain pour réceptionner le colis prévu à l'étape ${delivery.shipment_step} de votre tournée.\n\n` +
                                    `Afin d'assurer une livraison réussie, merci de bien vouloir déposer ce colis dans la boîte de livraison la plus proche que nous avons identifiée pour vous :\n\n` +
                                    `📍 Boîte : ${closestBox.name}\n` +
                                    `📫 Adresse : ${display_name || 'Adresse non disponible'}\n\n` +
                                    `Merci pour votre réactivité et votre professionnalisme.\n\n` +
                                    `Cordialement,\nL'équipe EcoDeli`
                            });

                            const exchangePoint = store?.exchangePoint

                            if (exchangePoint) {
                                exchangePoint.isbox = true;
                                exchangePoint.warehouse = null;
                                exchangePoint.city = city || "Ville non disponible";
                                exchangePoint.coordinates = {
                                    type: 'Point',
                                    coordinates: [closestBox.lon, closestBox.lat]
                                };
                                exchangePoint.address = address || "Adresse non disponible";
                                exchangePoint.postal_code = postal_code || "Code postal non disponible";
                                await this.exchangePointRepository.save(exchangePoint);
                            }
                        } else {
                            console.log(`⚠️ Informations du livreur incomplètes pour delivery ${delivery.delivery_id}`);
                        }

                    } else {
                        console.log(`No boxes found near delivery ${delivery.delivery_id}.`);
                    }
                }
            }
        }


        @Cron("0 19 * * *")
        async test() {
            const closestBox = this.boxService.findNearestBox(48.423173, 2.753979);

            const lat = closestBox?.lat || 0;
            const lon = closestBox?.lon || 0;

            let display_name: string | undefined;


            try {
                const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
                    params: {
                        format: 'json',
                        lat,
                        lon,
                    },
                    headers: {
                        'User-Agent': 'EcoDeli/1.0 (contact.ecodeli@gmail.com)',
                    },
                });

                const data = response.data;

                if (data) {
                    display_name = data.display_name;
                }

                console.log('Adresse récupérée depuis Nominatim:', display_name);
            } catch (error) {
                console.error('Erreur lors de la récupération de l’adresse depuis Nominatim:', error);
            }

            console.log('Closest box:', closestBox);      
        }

}