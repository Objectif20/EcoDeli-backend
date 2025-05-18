import { InjectRepository } from "@nestjs/typeorm";
import { ActiveDeliveryAsClient, DeliveryDetails } from "./type";
import { Users } from "src/common/entities/user.entity";
import { In, Repository } from "typeorm";
import { Shipment } from "src/common/entities/shipment.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import { MinioService } from "src/common/services/file/minio.service";


export class DeliveriesService {

        constructor(
            @InjectRepository(Users)
            private readonly userRepository: Repository<Users>,
            @InjectRepository(Shipment)
            private readonly shipmentRepository: Repository<Shipment>,
            @InjectRepository(Delivery)
            private readonly deliveryRepository: Repository<Delivery>,
            private readonly minioService : MinioService
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

}