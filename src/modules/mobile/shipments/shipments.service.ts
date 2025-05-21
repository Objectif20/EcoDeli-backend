import { InjectRepository } from "@nestjs/typeorm";
import { Shipment } from "src/common/entities/shipment.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { Not, Repository } from "typeorm";
import { ShipmentDetails, ShipmentListItem } from "./type";
import { Parcel } from "src/common/entities/parcels.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import { Users } from "src/common/entities/user.entity";

export class ShipmentsService {

    constructor(
        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,
        @InjectRepository(Parcel)
        private readonly parcelRepository: Repository<Parcel>,
        @InjectRepository(Delivery)
        private readonly deliveryRepository: Repository<Delivery>,
        @InjectRepository(Users)
        private readonly userRepository: Repository<Users>,
        private readonly minioService : MinioService
    ){

    }

    async getShipmentListItems(userId: string): Promise<ShipmentListItem[]> {
        const shipments = await this.shipmentRepository.find({
            where: { user: { user_id: userId }, status: Not('validated') },
            relations: ['parcels', 'deliveries'],
        });
    
        const shipmentListItems: ShipmentListItem[] = await Promise.all(
            shipments.map(async (shipment) => {
                try {
                    const parcels = await this.parcelRepository.find({ where: { shipment: { shipment_id: shipment.shipment_id } } });
                    const deliveries = await this.deliveryRepository.find({ where: { shipment: { shipment_id: shipment.shipment_id } } });
    
                    const packageCount = parcels.length;
                    const progress = (deliveries.length / (deliveries.length + 1))*100;
    
                    return {
                        id: shipment.shipment_id,
                        name: shipment.description ?? "Unnamed Shipment",
                        status: progress > 0 ? 'In Progress' : 'pending',
                        urgent: shipment.urgent,
                        departure: {
                            city: shipment.departure_city,
                        },
                        arrival: {
                            city: shipment.arrival_city,
                        },
                        arrival_date: shipment.deadline_date ? shipment.deadline_date.toISOString().split('T')[0] : null,
                        packageCount,
                        progress,
                        finished: shipment.status === 'finished',
                        initial_price: Number(shipment.estimated_total_price),
                    };
                } catch (error) {
                    console.error(`Error processing shipment ${shipment.shipment_id}:`, error);
                    return null;
                }
            })
        ).then(items => items.filter(item => item !== null)) as ShipmentListItem[];
        return shipmentListItems;
    }

    async getShipmentDetails(shipment_id: string, user_id : string): Promise<ShipmentDetails> {

        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ['clients'],
        });
        if (!user) {
            throw new Error('User not found');
        }
        const client = user.clients[0];
        if (!client) {
            throw new Error('Client not found');
        }

        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: shipment_id },
            relations: ['parcels', 'parcels.images', 'deliveries', 'deliveries.delivery_person', 'deliveries.delivery_person.user', 'deliveries.delivery_person.user.clients', 'stores', 'stores.exchangePoint'],
        });
    
        if (!shipment) {
            throw new Error('Shipment not found');
        }
    
        const parcels = await Promise.all(
            shipment.parcels.map(async parcel => ({
                id: parcel.parcel_id,
                name: parcel.name,
                fragility: parcel.fragility ?? false,
                estimated_price: Number(parcel.estimate_price),
                weight: Number(parcel.weight),
                volume: Number(parcel.volume),
                picture: await Promise.all(
                    parcel.images.map(img =>
                        this.minioService.generateImageUrl("client-images", img.image_url)
                    )
                ),
            }))
        );
    
        const deliveries = shipment.deliveries.sort((a, b) => a.shipment_step - b.shipment_step);
        const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);
    
        const initialPrice = Number(shipment.estimated_total_price ?? 0);
        const priceWithStep = deliveries.map(delivery => ({
            step: `Step ${delivery.shipment_step}`,
            price: Number(delivery.delivery_price ?? delivery.amount),
        }));
    
        const steps: {
            id: number;
            title: string;
            description: string;
            date: string;
            departure: { city: string; coordinates: [number, number] };
            arrival: { city: string; coordinates: [number, number] };
            courier: { name: string; photoUrl: string };
            idLink: string;
        }[] = [];
    
        if (deliveries.length === 0) {
            steps.push({
                id: -1,
                title: 'No Steps',
                description: 'Aucune étape de livraison n\'existe.',
                date: new Date().toISOString(),
                departure: {
                    city: shipment.departure_city || "",
                    coordinates: shipment.departure_location?.coordinates?.slice().reverse() as [number, number],
                },
                arrival: {
                    city: shipment.arrival_city || "",
                    coordinates: shipment.arrival_location?.coordinates?.slice().reverse() as [number, number],
                },
                courier: {
                    name: "Unknown",
                    photoUrl: "",
                },
                idLink: "-1",
            });
        } else {
            for (let i = 0; i < deliveries.length; i++) {
                const delivery = deliveries[i];
                const store = storesByStep.find(s => s.step === delivery.shipment_step);
                const courier = delivery.delivery_person;
    
                let departureCity, departureCoords, arrivalCity, arrivalCoords;
    
                if (delivery.shipment_step === 1) {
                    departureCity = shipment.departure_city;
                    departureCoords = shipment.departure_location?.coordinates?.slice().reverse() as [number, number];
                    arrivalCity = store?.exchangePoint?.city ?? "";
                    arrivalCoords = store?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number];
                } else {
                    const prevStore = storesByStep.find(s => s.step === delivery.shipment_step - 1);
                    departureCity = prevStore?.exchangePoint?.city ?? "";
                    departureCoords = prevStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number];
                    arrivalCity = store?.exchangePoint?.city ?? "";
                    arrivalCoords = store?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number];
                }
    
                const client = courier?.user.clients?.[0];
    
                steps.push({
                    id: delivery.shipment_step,
                    title: `Step ${delivery.shipment_step}`,
                    description: store?.exchangePoint?.description || 'Étape intermédiaire de livraison',
                    date: delivery.send_date?.toISOString() ?? new Date().toISOString(),
                    departure: {
                        city: departureCity,
                        coordinates: departureCoords,
                    },
                    arrival: {
                        city: arrivalCity,
                        coordinates: arrivalCoords,
                    },
                    courier: {
                        name: client ? `${client.first_name} ${client.last_name}` : "Unknown",
                        photoUrl: courier?.user.profile_picture ?? "",
                    },
                    idLink: delivery.delivery_id,
                });
            }
    
            const finalDelivery = deliveries.find(delivery => delivery.shipment_step === 1000);
            if (finalDelivery) {
                const lastStore = storesByStep.find(s => s.step === finalDelivery.shipment_step - 1);
                const client = finalDelivery.delivery_person?.user.clients?.[0];
    
                steps.push({
                    id: 1000,
                    title: 'Step finale',
                    description: 'Dernière étape de la livraison jusqu’au destinataire.',
                    date: finalDelivery.send_date?.toISOString() ?? new Date().toISOString(),
                    departure: {
                        city: lastStore?.exchangePoint?.city ?? "",
                        coordinates: lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number],
                    },
                    arrival: {
                        city: shipment.arrival_city || "",
                        coordinates: shipment.arrival_location?.coordinates?.slice().reverse() as [number, number],
                    },
                    courier: {
                        name: client ? `${client.first_name} ${client.last_name}` : "Unknown",
                        photoUrl: finalDelivery.delivery_person?.user.profile_picture ?? "",
                    },
                    idLink: finalDelivery.delivery_id,
                });
            }
        }
    
        let realArrivalCity = shipment.arrival_city;
        let realArrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse() as [number, number];
    
        if (deliveries.length > 0) {
            const lastDelivery = deliveries[deliveries.length - 1];
            if (lastDelivery.shipment_step === 1000) {
                realArrivalCity = shipment.arrival_city;
                realArrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse() as [number, number];
            } else {
                const lastStore = storesByStep.find(s => s.step === lastDelivery.shipment_step);
                realArrivalCity = lastStore?.exchangePoint?.city ?? shipment.arrival_city;
                realArrivalCoords = lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [number, number] ?? shipment.arrival_location?.coordinates?.slice().reverse() as [number, number];
            }
        }
    
        let finished = false;
        if (deliveries.some(delivery => delivery.shipment_step === 0)) {
            finished = true;
        }
    
        const result: ShipmentDetails = {
            details: {
                id: shipment.shipment_id,
                name: shipment.description || "",
                description: shipment.description || "",
                departure: {
                    city: shipment.departure_city || "",
                    coordinates: shipment.departure_location?.coordinates?.slice().reverse() as [number, number],
                },
                arrival: {
                    city: realArrivalCity || "",
                    coordinates: realArrivalCoords,
                },
                departure_date: shipment.deadline_date?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
                arrival_date: shipment.deadline_date?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
                status: shipment.status ?? 'In Progress',
                initial_price: initialPrice,
                price_with_step: priceWithStep,
                invoice: parcels.map(p => ({
                    name: p.name,
                    url_invoice: "",
                })),
                urgent: shipment.urgent,
                finished: finished,
                trolleydrop: shipment.trolleydrop || false,
                complementary_info: '',
                facture_url: "",
            },
            package: parcels,
            steps: steps,
        };
    
        return result;
    }


}