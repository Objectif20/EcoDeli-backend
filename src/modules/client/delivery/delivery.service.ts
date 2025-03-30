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

        private readonly minioService: MinioService, 
    ) {}

    async createDelivery(createShipmentDTO: CreateShipmentDTO, files: Express.Multer.File[]) {
        if (!createShipmentDTO.user_id) {
            throw new Error("User ID is required.");
        }
    
        const user = await this.userRepository.findOneBy({ user_id: createShipmentDTO.user_id });
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
            console.log(`Filtering by location: Latitude=${filters.latitude}, Longitude=${filters.longitude}, Radius=${filters.radius}`);
            queryBuilder.andWhere(
                `ST_DWithin(
                    shipment.departure_location::geography,
                    ST_SetSRID(ST_MakePoint(:latitude, :longitude), 4326)::geography,
                    :radius
                )`,
                { latitude: filters.latitude, longitude: filters.longitude, radius: filters.radius*1000 }
            );
        }
    
        if (filters.routeStartLatitude && filters.routeStartLongitude && filters.routeEndLatitude && filters.routeEndLongitude && filters.routeRadius) {
            console.log(`Filtering by route: StartLat=${filters.routeStartLatitude}, StartLon=${filters.routeStartLongitude}, EndLat=${filters.routeEndLatitude}, EndLon=${filters.routeEndLongitude}, Radius=${filters.routeRadius}`);
            queryBuilder.andWhere(
                `ST_DWithin(
                    shipment.departure_location::geography,
                    ST_SetSRID(ST_MakeLine(ST_MakePoint(:startLat, :startLon), ST_MakePoint(:endLat, :endLon)), 4326)::geography,
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
        return await queryBuilder.getMany();
    }

    async getShipmentById(id: string): Promise<Shipment> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: id },
            relations: ["parcels", "parcels.parcelImages"]
        });

        if (!shipment) {
            throw new Error("Shipment not found.");
        }

        return shipment;
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

    async createStepDelivery(createDeliveryDto: CreateDeliveryDto): Promise<Delivery> {
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
          amount: shipment.proposed_delivery_price || 0,
          send_date: new Date(),
          shipment_step: newStep,
        });
    
        return this.deliveryRepository.save(delivery);
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
