import { Inject, Injectable } from "@nestjs/common";
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from "@nestjs/typeorm";
import axios from "axios";
import { Delivery } from "src/common/entities/delivery.entity";
import { BoxService } from "src/common/services/dataset/boxes.service";
import { Repository } from "typeorm";
import * as nodemailer from 'nodemailer';
import { ExchangePoint } from "src/common/entities/exchange_points.entity";
import { Trip } from "src/common/entities/trips.entity";
import { Users } from "src/common/entities/user.entity";

@Injectable()
export class DeliveryScheduleService {

    constructor(
        @InjectRepository(Delivery)
        private readonly deliveryRepository: Repository<Delivery>,
        @InjectRepository(ExchangePoint)
        private readonly exchangePointRepository: Repository<ExchangePoint>,
        @InjectRepository(Trip)
        private readonly tripRepo: Repository<Trip>,
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

        @Cron('0 20 * * *')
        async notifyMatchingTrips() {
        const deliveries = await this.deliveryRepository
            .createQueryBuilder('delivery')
            .leftJoinAndSelect('delivery.shipment', 'shipment')
            .leftJoinAndSelect('shipment.stores', 'store')
            .leftJoinAndSelect('store.exchangePoint', 'exchangePoint')
            .where('delivery.send_date >= CURRENT_DATE')
            .andWhere('delivery.delivery_person_id IS NULL')
            .andWhere('delivery.shipment_step BETWEEN 1 AND 9999')
            .andWhere('exchangePoint.coordinates IS NOT NULL')
            .getMany();

        if (!deliveries.length) return;

        const trips = await this.tripRepo
            .createQueryBuilder('trip')
            .leftJoinAndSelect('trip.delivery_person', 'delivery_person')
            .leftJoinAndSelect('delivery_person.user', 'user')
            .where('(trip.date IS NULL OR trip.date >= CURRENT_DATE OR trip.weekday IS NOT NULL)')
            .getMany();

        if (!trips.length) return;

        const matchesByUser: Map<Users['user_id'], { user: Users; deliveries: Delivery[] }> = new Map();

        for (const delivery of deliveries) {
            const relevantStore = delivery.shipment?.stores?.find(store => store.step === delivery.shipment_step);
            const deliveryCoords = relevantStore?.exchangePoint?.coordinates;

            if (!deliveryCoords) continue;

            for (const trip of trips) {
            const tripCoords = trip.departure_location;
            const radiusKm = trip.tolerated_radius ?? 0;

            if (this.isWithinRadius(deliveryCoords, tripCoords, radiusKm)) {
                const user = trip.delivery_person.user;
                if (!user?.email) continue;

                if (!matchesByUser.has(user.user_id)) {
                matchesByUser.set(user.user_id, { user, deliveries: [] });
                }

                matchesByUser.get(user.user_id)!.deliveries.push(delivery);
            }
            }
        }

        for (const { user, deliveries } of matchesByUser.values()) {
            console.log(`Matching deliveries for user ${user.email}:`, deliveries);
        }
        }

        private isWithinRadius(
            pointA: { x: number; y: number },
            pointB: { x: number; y: number },
            radiusKm: number,
        ): boolean {
            const toRad = (value: number) => (value * Math.PI) / 180;
            const R = 6371;

            const dLat = toRad(pointB.y - pointA.y);
            const dLon = toRad(pointB.x - pointA.x);
            const lat1 = toRad(pointA.y);
            const lat2 = toRad(pointB.y);

            const a =
            Math.sin(dLat / 2) ** 2 +
            Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            const distance = R * c;
            return distance <= radiusKm;
        }

}