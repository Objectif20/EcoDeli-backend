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
    
    
}
