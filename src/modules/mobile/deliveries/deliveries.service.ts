import { InjectRepository } from "@nestjs/typeorm";
import { ActiveDeliveryAsClient } from "./type";
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

}