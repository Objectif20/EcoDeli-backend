import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateShipmentDTO } from "./dto/create-shipment.dto";
import { Shipment } from "src/common/entities/shipment.entity";
import { Parcel } from "src/common/entities/parcels.entity";
import { ParcelImage } from "src/common/entities/parcel_images.entity";
import { DeliveryKeyword } from "src/common/entities/delivery_keywords.entity";
import { Keyword } from "src/common/entities/keywords.entity";
import { Users } from "src/common/entities/user.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { v4 as uuidv4 } from 'uuid';
import * as path from "path"
import { GetShipmentsDTO } from "./dto/get-shipment.dto";
import { Delivery } from "src/common/entities/delivery.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Favorite } from "src/common/entities/favorites.entity";
import { DeliveryReviewResponse } from "src/common/entities/delivery_review_responses.entity";
import { DeliveryReview } from "src/common/entities/delivery_reviews.entity";
import { Point } from 'geojson';
import { Warehouse } from "src/common/entities/warehouses.entity";
import { ExchangePoint } from "src/common/entities/exchange_points.entity";
import { Store } from "src/common/entities/stores.entity";
import { CreateDeliveryDto } from "./dto/create-delivery.dto";
import { StripeService } from "src/common/services/stripe/stripe.service";
import { Client } from "src/common/entities/client.entity";


@Injectable()
export class DeliveryService {

    constructor(
        @InjectRepository(Shipment)
        private readonly shipmentRepository: Repository<Shipment>,
        
        @InjectRepository(Parcel)
        private readonly parcelRepository: Repository<Parcel>,

        @InjectRepository(ParcelImage)
        private readonly parcelImageRepository: Repository<ParcelImage>,

        @InjectRepository(DeliveryKeyword)
        private readonly deliveryKeywordRepository: Repository<DeliveryKeyword>,

        @InjectRepository(Keyword)
        private readonly keywordRepository: Repository<Keyword>,

        @InjectRepository(Users)
        private readonly userRepository: Repository<Users>,

        @InjectRepository(Delivery)
        private readonly deliveryRepository: Repository<Delivery>,

        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,

        @InjectRepository(Favorite)
        private readonly favoriteRepository: Repository<Favorite>,

        @InjectRepository(DeliveryReviewResponse)
        private readonly deliveryReviewResponseRepository: Repository<DeliveryReviewResponse>,

        @InjectRepository(DeliveryReview)
        private readonly deliveryReviewRepository: Repository<DeliveryReview>,

        @InjectRepository(Warehouse)
        private readonly warehouseRepository: Repository<Warehouse>,

        @InjectRepository(ExchangePoint)
        private readonly exchangePointRepository: Repository<ExchangePoint>,

        @InjectRepository(Store)
        private readonly storeRepository: Repository<Store>,

        @InjectRepository(Client)
        private readonly clientRepository: Repository<Client>,


        private readonly stripeService : StripeService,
        private readonly minioService: MinioService, 
    ) {}

    async createDelivery(createShipmentDTO: CreateShipmentDTO, files: Express.Multer.File[], user_id : string) {
        if (!user_id) {
            throw new Error("User ID is required.");
        }
    
        const user = await this.userRepository.findOneBy({ user_id: user_id });
        if (!user) {
            throw new Error("User not found.");
        }
    
        const shipment = this.shipmentRepository.create({
            description: createShipmentDTO.shipment.description,
            estimated_total_price: Number(createShipmentDTO.shipment.estimated_total_price),
            proposed_delivery_price: Number(createShipmentDTO.shipment.proposed_delivery_price),
            weight: parseFloat(createShipmentDTO.shipment.weight ?? "0"),
            volume: parseFloat(createShipmentDTO.shipment.volume ?? "0"),
            deadline_date: createShipmentDTO.shipment.deadline_date,
            time_slot: createShipmentDTO.shipment.time_slot,
            urgent: createShipmentDTO.shipment.urgent === 'true',
            status: createShipmentDTO.shipment.status,
            departure_city: createShipmentDTO.shipment.departure_city,
            arrival_city: createShipmentDTO.shipment.arrival_city,
            image: "https://static.vecteezy.com/ti/vecteur-libre/p1/5720408-icone-image-croisee-image-non-disponible-supprimer-symbole-vecteur-image-gratuit-vectoriel.jpg",
            user: user,
        });
    
        const departureLatitude = parseFloat(createShipmentDTO.shipment.departure_location.latitude);
        const departureLongitude = parseFloat(createShipmentDTO.shipment.departure_location.longitude);
        const arrivalLatitude = parseFloat(createShipmentDTO.shipment.arrival_location.latitude);
        const arrivalLongitude = parseFloat(createShipmentDTO.shipment.arrival_location.longitude);
    
        if (!isNaN(departureLatitude) && !isNaN(departureLongitude)) {
            shipment.departure_location = {
                type: 'Point',
                coordinates: [departureLongitude, departureLatitude],
            };
        }
    
        if (!isNaN(arrivalLatitude) && !isNaN(arrivalLongitude)) {
            shipment.arrival_location = {
                type: 'Point',
                coordinates: [arrivalLongitude, arrivalLatitude],
            };
        }
    
        const savedShipment = await this.shipmentRepository.save(shipment);
    
        const savedParcels: Parcel[] = [];
    
        for (const [parcelIndex, parcelDTO] of createShipmentDTO.shipment.parcels.entries()) {
            if (!parcelDTO.name) continue;
    
            const parcel = this.parcelRepository.create({
                name: parcelDTO.name,
                weight: parcelDTO.weight ? parseFloat(parcelDTO.weight) : null,
                fragility: parcelDTO.fragility === 'true',
                volume: parcelDTO.volume ? parseFloat(parcelDTO.volume) : null,
                estimate_price: parcelDTO.estimate_price ? parseFloat(parcelDTO.estimate_price) : null,
                shipment: savedShipment,
            });
    
            const savedParcel = await this.parcelRepository.save(parcel);
            savedParcels.push(savedParcel);
    
            let imageIndex = 1;
            while (true) {
                const imageFieldName = `shipment[parcels][${parcelIndex}][images_${imageIndex}]`;
                const file = files.find(file => file.fieldname.trim() === imageFieldName);
    
                if (!file) {
                    break;
                }
    
                const fileExtension = path.extname(file.originalname);
                const uniqueFileName = `${uuidv4()}${fileExtension}`;
                const filePath = `shipments/${savedShipment.shipment_id}/parcels/${savedParcel.parcel_id}/images/${uniqueFileName}`;
                await this.minioService.uploadFileToBucket('client-images', filePath, file);
    
                const parcelImage = this.parcelImageRepository.create({
                    parcel: savedParcel,
                    image_url: filePath,
                });
    
                await this.parcelImageRepository.save(parcelImage);
                imageIndex++;
            }
        }


    
        const { user: shipmentUser, ...shipmentWithoutUser } = savedShipment;
        return shipmentWithoutUser;
        
    }

    async getShipments(filters: GetShipmentsDTO): Promise<Shipment[]> {
        const queryBuilder = this.shipmentRepository.createQueryBuilder("shipment");
    
        if (filters.latitude && filters.longitude && filters.radius) {
            queryBuilder.andWhere(
                `ST_DWithin(
                    shipment.departure_location::geography,
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                    :radius
                )`,
                { latitude: filters.latitude, longitude: filters.longitude, radius: filters.radius }
            );
        } else {
            queryBuilder.andWhere(
                `ST_Intersects(
                    shipment.departure_location::geography,
                    ST_SetSRID(ST_MakeEnvelope(-5, 41, 10, 52, 4326), 4326)::geography
                )`
            );
        }
    
        if (filters.routeStartLatitude && filters.routeStartLongitude && filters.routeEndLatitude && filters.routeEndLongitude && filters.routeRadius) {
            queryBuilder.andWhere(
                `ST_DWithin(
                    shipment.departure_location::geography,
                    ST_SetSRID(ST_MakeLine(ST_MakePoint(:startLon, :startLat), ST_MakePoint(:endLon, :endLat)), 4326)::geography,
                    :routeRadius
                )`,
                {
                    startLat: filters.routeStartLatitude,
                    startLon: filters.routeStartLongitude,
                    endLat: filters.routeEndLatitude,
                    endLon: filters.routeEndLongitude,
                    routeRadius: filters.routeRadius
                }
            );
        }
    
        if (filters.minPrice !== undefined) {
            queryBuilder.andWhere("shipment.estimated_total_price >= :minPrice AND shipment.estimated_total_price IS NOT NULL", { minPrice: filters.minPrice });
        }
    
        if (filters.maxPrice !== undefined) {
            queryBuilder.andWhere("shipment.estimated_total_price <= :maxPrice AND shipment.estimated_total_price IS NOT NULL", { maxPrice: filters.maxPrice });
        }
    
        if (filters.minWeight !== undefined) {
            queryBuilder.andWhere("shipment.weight >= :minWeight AND shipment.weight IS NOT NULL", { minWeight: filters.minWeight });
        }
    
        if (filters.maxWeight !== undefined) {
            queryBuilder.andWhere("shipment.weight <= :maxWeight AND shipment.weight IS NOT NULL", { maxWeight: filters.maxWeight });
        }
    
        if (filters.page && filters.limit) {
            const offset = (filters.page - 1) * filters.limit;
            queryBuilder.skip(offset).take(filters.limit);
        }
    
        const result = await queryBuilder.getMany();
        return result;
    }
    

    async getShipmentById(id: string): Promise<any> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: id },
            relations: [
                'parcels',
                'parcels.images',
                'deliveries',
                'deliveries.delivery_person',
                'stores',
                'stores.exchangePoint',
            ],
        });
    
        if (!shipment) throw new Error('Shipment not found');


    
        const parcels = await Promise.all(
            shipment.parcels.map(async parcel => ({
              id: parcel.parcel_id,
              name: parcel.name,
              fragility: parcel.fragility,
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
    
        const initialPrice = Number(shipment.estimated_total_price ?? 0);
        const priceWithStep = deliveries.map(delivery => ({
            step: `Step ${delivery.shipment_step}`,
            price: Number(delivery.delivery_price ?? delivery.amount),
        }));
    
        const steps: {
            id: string | number;
            title: string;
            description: string;
            date: string | undefined;
            departure: { city: string | null; coordinates: any };
            arrival: { city: string | null; coordinates: any };
            courier: { name: string; photoUrl: string | null } | null;
        }[] = [];
    
        if (deliveries.length === 0) {
            steps.push({
                id: "0",
                title: 'Step 0',
                description: 'Livraison directe sans étape intermédiaire.',
                date: shipment.deadline_date?.toISOString(),
                departure: {
                    city: shipment.departure_city,
                    coordinates: shipment.departure_location?.coordinates.reverse(),
                },
                arrival: {
                    city: shipment.arrival_city,
                    coordinates: shipment.arrival_location?.coordinates.reverse(),
                },
                courier: null,
            });
        }
    
        const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);
        for (let i = 0; i < deliveries.length; i++) {
            const delivery = deliveries[i];
            const store = storesByStep.find(s => s.step === delivery.shipment_step);
            const courier = delivery.delivery_person;
    
            let departureCity, departureCoords, arrivalCity, arrivalCoords;
    
            if (delivery.shipment_step === 1) {
                departureCity = shipment.departure_city;
                departureCoords = shipment.departure_location?.coordinates.reverse();
                arrivalCity = store?.exchangePoint?.city;
                arrivalCoords = store?.exchangePoint?.coordinates.coordinates.reverse();
            } else if (i < storesByStep.length) {
                departureCity = storesByStep[i - 1]?.exchangePoint?.city;
                departureCoords = storesByStep[i - 1]?.exchangePoint?.coordinates.coordinates.reverse();
                arrivalCity = store?.exchangePoint?.city;
                arrivalCoords = store?.exchangePoint?.coordinates.coordinates.reverse();
            }

            const client = await this.clientRepository.findOne({
                where: { user: { user_id: delivery.delivery_person.user.user_id } },
                relations: ['user'],
            });
    
            steps.push({
                id: delivery.shipment_step,
                title: `Step ${delivery.shipment_step}`,
                description: store?.exchangePoint?.description || 'Étape intermédiaire de livraison',
                date: delivery.send_date?.toISOString(),
                departure: {
                    city: departureCity,
                    coordinates: departureCoords,
                },
                arrival: {
                    city: arrivalCity,
                    coordinates: arrivalCoords,
                },
                courier: {
                    name: client?.first_name + ' ' + client?.last_name,
                    photoUrl: courier?.user.profile_picture || null,
                },
            });
        }
    
        if (deliveries.length > 0) {
            const lastDelivery = deliveries[deliveries.length - 1];
            const lastStore = storesByStep.find(s => s.step === lastDelivery.shipment_step);
    
            const client = await this.clientRepository.findOne({
                where: { user: { user_id: lastDelivery.delivery_person.user.user_id } },
                relations: ['user'],
            });


            steps.push({
                id: 1000,
                title: 'Step finale',
                description: 'Dernière étape de la livraison jusqu’au destinataire.',
                date: shipment.deadline_date?.toISOString(),
                departure: {
                    city: lastStore?.exchangePoint?.city || "",
                    coordinates: lastStore?.exchangePoint?.coordinates.coordinates.reverse(),
                },
                arrival: {
                    city: shipment.arrival_city,
                    coordinates: shipment.arrival_location?.coordinates.reverse(),
                },
                courier: {
                    name: client?.first_name + ' ' + client?.last_name,
                    photoUrl: client?.user.profile_picture || null,
                },
            });
        }
    
        const result = {
            details: {
                id: shipment.shipment_id,
                name: "Package Delivery",
                description: shipment.description,
                complementary_info: shipment.urgent ? "Livraison urgente à effectuer rapidement." : "Package to be delivered on time",
                departure: {
                    city: shipment.departure_city,
                    coordinates: shipment.departure_location?.coordinates.reverse(),
                },
                arrival: {
                    city: shipment.arrival_city,
                    coordinates: shipment.arrival_location?.coordinates.reverse(),
                },
                departure_date: shipment.deadline_date?.toISOString().split('T')[0],
                arrival_date: shipment.deadline_date?.toISOString().split('T')[0],
                status: shipment.status ?? 'In Progress',
                initial_price: initialPrice,
                price_with_step: priceWithStep,
                invoice: parcels.map(p => ({
                    name: p.name,
                    url_invoice: p.picture[0],
                })),
            },
            package: parcels,
            steps: steps,
        };
    
        return result;
    }

    async bookShipment(id: string, user_id: string): Promise<Delivery> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: id },
        });
    
        if (!shipment) {
            throw new Error("Shipment not found.");
        }
    
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ["deliveryPerson"],
        });
    
        if (!user || !user.deliveryPerson) {
            throw new Error("User or delivery person profile not found.");
        }
    
        const delivery = this.deliveryRepository.create({
            send_date: new Date(),
            status: 'pending',
            amount: shipment.proposed_delivery_price ?? 0,
            shipment: shipment,
            delivery_person: user.deliveryPerson,
        });
    
        const savedDelivery = await this.deliveryRepository.save(delivery);
    
        return savedDelivery;
    }

    async cancelDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment"],

        });

        if (!delivery) {
            throw new Error("Delivery not found.");
        }

        if (delivery.delivery_person.user.user_id !== user_id) {
            throw new Error("User is not authorized to cancel this delivery.");
        }

        if (delivery.status === 'finished') {
            throw new Error("Cannot cancel a finished delivery.");
        }

        if (delivery.status === 'validated') {
            throw new Error("Cannot cancel a validated delivery.");
        }

        delivery.status = 'canceled';
        await this.deliveryRepository.save(delivery);
        return { message: "Delivery canceled successfully." };
    }

    async getShipmentFavorites(user_id: string, page: number, limit: number): Promise<Shipment[]> {
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ["deliveryPerson", "deliveryPerson.favorites", "deliveryPerson.favorites.shipment"],
        });
    
        if (!user || !user.deliveryPerson) {
            throw new Error("User or delivery person profile not found.");
        }
    
        const favorites = user.deliveryPerson.favorites
            .filter(favorite => favorite.shipment.status !== 'finish')
            .slice((page - 1) * limit, page * limit);
    
        return favorites.map(favorite => favorite.shipment);
    }

    async addToFavorites(user_id: string, shipment_id: string): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ["deliveryPerson", "deliveryPerson.favorites"],
        });
    
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: shipment_id },
        });
    
        if (!user || !user.deliveryPerson || !shipment) {
            throw new Error("User, delivery person profile, or shipment not found.");
        }
    
        const existingFavorite = user.deliveryPerson.favorites.find(favorite => favorite.shipment_id === shipment_id);
        if (existingFavorite) {
            throw new Error("Shipment is already in favorites.");
        }
    
        const favorite = new Favorite();
        favorite.shipment_id = shipment_id;
        favorite.delivery_person_id = user.deliveryPerson.delivery_person_id;
        favorite.shipment = shipment;
        favorite.delivery_person = user.deliveryPerson;
    
        await this.favoriteRepository.save(favorite);
    }

    async removeFromFavorites(user_id: string, shipment_id: string): Promise<{ message: string }> {
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ["deliveryPerson"],
        });
    
        if (!user || !user.deliveryPerson) {
            throw new Error("User or delivery person profile not found.");
        }
    
        const favorite = await this.favoriteRepository.findOne({
            where: { delivery_person_id: user.deliveryPerson.delivery_person_id, shipment_id: shipment_id },
        });
    
        if (!favorite) {
            throw new Error("Favorite not found.");
        }
    
        await this.favoriteRepository.remove(favorite);
    
        return { message: "Favorite removed successfully." };
    }

    async addComment(comment: string, userId: string, deliveryId: string): Promise<{ message: string }> {
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["shipment", "shipment.user"],
        });
    
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
    
        if (delivery.shipment.user.user_id !== userId) {
            throw new Error("User is not authorized to comment on this delivery.");
        }
    
        const deliveryReview = new DeliveryReview();
        deliveryReview.comment = comment;
        deliveryReview.rating = 0; 
        deliveryReview.delivery = delivery;
    
        await this.deliveryReviewRepository.save(deliveryReview);
    
        return {message: "Comment added successfully"};
    }

    async replyComment(comment: string, userId: string, deliveryId: string, commentId: string): Promise<{ message: string }> {
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "delivery_person.user"],
        });
    
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
    
        if (delivery.delivery_person.user.user_id !== userId) {
            throw new Error("User is not authorized to reply to this comment.");
        }
    
        const deliveryReview = await this.deliveryReviewRepository.findOne({
            where: { review_id: commentId },
            relations: ["responses"],
        });
    
        if (!deliveryReview) {
            throw new Error("Comment not found.");
        }
    
        const deliveryReviewResponse = new DeliveryReviewResponse();
        deliveryReviewResponse.comment = comment;
        deliveryReviewResponse.review = deliveryReview;
    
        await this.deliveryReviewResponseRepository.save(deliveryReviewResponse);
    
        return {message: "Comment replied successfully"}
    }

    async startDelivery(deliveryId: string, delivery_code, user_id : string ) : Promise<{ message: string }> {

        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment"],
        });
    
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
    
        if (delivery.delivery_person.user.user_id !== user_id) {
            throw new Error("User is not authorized to start this delivery.");
        }
    
        delivery.status = 'in_progress';
        delivery.delivery_code = delivery_code;
    
        await this.deliveryRepository.save(delivery);
    
        return { message: "Delivery started successfully." };
    }

    async finsihDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {

        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment"],
        });
    
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
    
        if (delivery.delivery_person.user.user_id !== user_id) {
            throw new Error("User is not authorized to finish this delivery.");
        }
    
        delivery.status = 'finished';
    
        await this.deliveryRepository.save(delivery);
    
        return { message: "Delivery finished successfully." };
    }

    async validateDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {

        // user_id correspondà l'id du créateur de la livraison
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["shipment"],
        });
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
        if (delivery.shipment.user.user_id !== user_id) {
            throw new Error("User is not authorized to validate this delivery.");
        }
        delivery.status = 'validated';
        await this.deliveryRepository.save(delivery);
        return { message: "Delivery validated successfully." }; 

    }

    async getDeliveryStatus(deliveryId: string): Promise<{ status: string }> {

        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
        });
    
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
    
        return { status: delivery.status };
    }

    async createStepDelivery(createDeliveryDto: CreateDeliveryDto, updatedAmount: number): Promise<Delivery> {
        const { shipmentId, deliveryPersonId, warehouseId, newExchangePointData } = createDeliveryDto;
    
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: shipmentId },
            relations: ['stores'],
        });
    
        if (!shipment) {
            throw new Error('Shipment not found');
        }
    
        const deliveryPerson = await this.deliveryPersonRepository.findOne({
            where: { user: { user_id: deliveryPersonId } },
        });
    
        if (!deliveryPerson) {
            throw new Error('Delivery person not found');
        }
    
        let exchangePoint: ExchangePoint;
        if (warehouseId) {
            const warehouse = await this.warehouseRepository.findOne({
                where: { warehouse_id: warehouseId },
            });
    
            if (!warehouse) {
                throw new Error('Warehouse not found');
            }
    
            exchangePoint = this.exchangePointRepository.create({
                city: warehouse.city,
                coordinates: warehouse.coordinates,
                warehouse,
            });
        } else if (newExchangePointData) {
            exchangePoint = this.exchangePointRepository.create({
                city: newExchangePointData.city,
                coordinates: newExchangePointData.coordinates,
            });
        } else {
            throw new Error('Either warehouseId or newExchangePointData must be provided');
        }
    
        exchangePoint = await this.exchangePointRepository.save(exchangePoint);
    
        const lastStep = shipment.stores.length > 0 ? Math.max(...shipment.stores.map(store => store.step)) : 0;
        const newStep = lastStep + 1;
    
        const store = this.storeRepository.create({
            shipment,
            exchangePoint,
            step: newStep,
            start_date: new Date(),
            end_date: new Date(),
        });
    
        await this.storeRepository.save(store);
    
        const delivery = this.deliveryRepository.create({
            shipment,
            delivery_person: deliveryPerson,
            status: 'pending',
            amount: updatedAmount, // Utiliser le prix mis à jour
            send_date: new Date(),
            shipment_step: newStep,
        });
    
        return this.deliveryRepository.save(delivery);
    }

    // Création d'une livraison négociée (prix, date, etc.)
    async createNegotiatedDelivery(shipmentId: string, userId: string, updatedAmount: number): Promise<Delivery> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: shipmentId },
            relations: ["user"],
        });
    
        if (!shipment) {
            throw new Error("Shipment not found.");
        }
        if (shipment.user.user_id !== userId) {
            throw new Error("User is not authorized to create a negotiated delivery for this shipment.");
        }
    
        const delivery = this.deliveryRepository.create({
            send_date: new Date(),
            status: 'pending',
            amount: updatedAmount, // Utiliser le prix mis à jour
            shipment: shipment,
        });
    
        const savedDelivery = await this.deliveryRepository.save(delivery);
        await this.shipmentRepository.save(shipment);
        return savedDelivery;
    }

    async deleteShipment(shipmentId: string, user_id : string): Promise<{ message: string }> {

        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: shipmentId },
            relations: ["user"],
        });
        
        if (!shipment) {
            throw new Error("Shipment not found.");
        }
        if (shipment.user.user_id !== user_id) {
            throw new Error("User is not authorized to delete this shipment.");
        }
    
        await this.shipmentRepository.remove(shipment);
    
        return { message: "Shipment deleted successfully." };

    }

}
