import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MinioService } from 'src/common/services/file/minio.service';
import { Delivery } from 'src/common/entities/delivery.entity';
import { Users } from 'src/common/entities/user.entity';
import { DeliveryDetails, DeliveryOnGoing } from './type';

@Injectable()
export class DeliveriesService {
    constructor(
        @InjectRepository(Delivery)
        private readonly deliveryRepository: Repository<Delivery>,

        @InjectRepository(Users)
        private readonly userRepository: Repository<Users>,

        private readonly minioService: MinioService,
    ) { }


        async getOngoingDeliveries(
            page: number = 1,
            limit: number = 10
        ): Promise<{ totalRows: number; deliveries: DeliveryOnGoing[] }> {
            const offset = (page - 1) * limit;

            const totalRows = await this.deliveryRepository.count();

            const deliveries = await this.deliveryRepository.find({
                skip: offset,
                take: limit,
                relations: [
                    'shipment',
                    'shipment.stores',
                    'shipment.stores.exchangePoint',
                    'shipment.parcels', // ⬅️ pour compter les colis
                ],
            });

            const ongoingDeliveries: DeliveryOnGoing[] = deliveries.map(delivery => {
                const shipment = delivery.shipment;
                const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);

                let currentCoordinates: [number, number] = [0, 0];
                let progress = 0;
                let isBox = false;

                if (delivery.shipment_step === 0) {
                    currentCoordinates = shipment.departure_location.coordinates.slice().reverse() as [number, number];
                    progress = 0;
                    isBox = storesByStep[0]?.exchangePoint?.isbox ?? false;
                } else if (delivery.shipment_step === 1000) {
                    currentCoordinates = shipment.arrival_location.coordinates.slice().reverse() as [number, number];
                    progress = 100;
                } else {
                    const currentStore = storesByStep.find(store => store.step === delivery.shipment_step);
                    if (currentStore) {
                        currentCoordinates = currentStore.exchangePoint.coordinates.coordinates.slice().reverse() as [number, number];
                        progress = (delivery.shipment_step / 1000) * 100;
                        isBox = currentStore.exchangePoint.isbox ?? false;
                    }
                }

                return {
                    id: delivery.delivery_id,
                    from: shipment.departure_city ?? "Unknown",
                    to: shipment.arrival_city ?? "Unknown",
                    status: delivery.status,
                    pickupDate: shipment.deadline_date ? shipment.deadline_date.toISOString().split('T')[0] : null,
                    estimatedDeliveryDate: shipment.deadline_date ? shipment.deadline_date.toISOString().split('T')[0] : null,
                    coordinates: {
                        origin: shipment.departure_location.coordinates.slice().reverse() as [number, number],
                        destination: shipment.arrival_location.coordinates.slice().reverse() as [number, number],
                    },
                    progress,
                    isBox,
                    price: Number(delivery.delivery_price ?? delivery.amount ?? 0),
                    packageCount: shipment.parcels?.length ?? 0,
                };
            });

            return {
                totalRows,
                deliveries: ongoingDeliveries,
            };
        }

    async getDeliveryDetails(_: string, delivery_id: string): Promise<DeliveryDetails> {
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
            const storesByStep = (shipment.stores || []).sort((a, b) => a.step - b.step);
            const step = delivery.shipment_step;

            let departureCity: string | undefined;
            let departureCoords: [number, number] | undefined;
            let departureAddress: string | undefined;
            let departurePostal: string | undefined;
            let arrivalCity: string | undefined;
            let arrivalCoords: [number, number] | undefined;
            let arrivalAddress: string | undefined;
            let arrivalPostal: string | undefined;
            let isBox: boolean | undefined;

            if (step === 0) {
                departureCity = shipment.departure_city || "";
                departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [number, number];
                departureAddress = shipment.departure_address || "";
                departurePostal = shipment.departure_postal || "";

                arrivalCity = storesByStep[0]?.exchangePoint?.city ?? shipment.arrival_city;
                arrivalCoords = storesByStep[0]?.exchangePoint?.coordinates.coordinates?.slice().reverse()
                    ?? shipment.arrival_location?.coordinates?.slice().reverse();
                arrivalAddress = storesByStep[0]?.exchangePoint?.address ?? shipment.arrival_address;
                arrivalPostal = storesByStep[0]?.exchangePoint?.postal_code ?? shipment.arrival_postal;
                isBox = storesByStep[0]?.exchangePoint?.isbox;
            } else if (step === 1000) {
                const lastStore = storesByStep.find(s => s.step === step - 1);
                departureCity = lastStore?.exchangePoint?.city ?? shipment.departure_city ?? undefined;
                departureCoords = lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse()
                    ?? shipment.departure_location?.coordinates?.slice().reverse();
                departureAddress = lastStore?.exchangePoint?.address ?? shipment.departure_address ?? "";
                departurePostal = lastStore?.exchangePoint?.postal_code ?? shipment.departure_postal ?? "";

                arrivalCity = shipment.arrival_city ?? undefined;
                arrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse();
                arrivalAddress = shipment.arrival_address || "";
                arrivalPostal = shipment.arrival_postal || "";
            } else {
                const prevStore = storesByStep.find(s => s.step === step - 1);
                const currStore = storesByStep.find(s => s.step === step);

                if (!prevStore) {
                    departureCity = shipment.departure_city ?? undefined;
                    departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [number, number];
                    departureAddress = shipment.departure_address || "";
                    departurePostal = shipment.departure_postal || "";
                } else {
                    departureCity = prevStore.exchangePoint?.city;
                    departureCoords = prevStore.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number];
                    departureAddress = prevStore.exchangePoint?.address;
                    departurePostal = prevStore.exchangePoint?.postal_code;
                }

                arrivalCity = currStore?.exchangePoint?.city;
                arrivalCoords = currStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number];
                arrivalAddress = currStore?.exchangePoint?.address;
                arrivalPostal = currStore?.exchangePoint?.postal_code;
                isBox = currStore?.exchangePoint?.isbox;
            }

            const deliveryDetails: DeliveryDetails = {
                departure: {
                    city: departureCity || '',
                    address: departureAddress || '',
                    postalCode: departurePostal || '',
                    coordinates: departureCoords ?? [0, 0],
                },
                arrival: {
                    city: arrivalCity || '',
                    address: arrivalAddress || '',
                    postalCode: arrivalPostal || '',
                    coordinates: arrivalCoords ?? [0, 0],
                },
                departure_date: delivery.send_date?.toISOString() || '',
                arrival_date: delivery.delivery_date?.toISOString() || '',
                status: (['pending', 'taken', 'finished', 'validated'].includes(delivery.status)
                    ? delivery.status
                    : 'pending') as 'pending' | 'taken' | 'finished' | 'validated',
                total_price: Number(delivery.delivery_price ?? delivery.amount),
                cart_dropped: shipment.trolleydrop,
                isBox: isBox || false,
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

}