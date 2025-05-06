import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Not, Repository } from "typeorm";
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
import { DeliveryCommission } from "src/common/entities/delivery_commission.entity";
import * as crypto from 'crypto';
import * as QRCode from 'qrcode';
import { BookPartialDTO } from "./dto/book-partial.dto";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { Message } from "src/common/schemas/message.schema";
import { CurrentDeliveryAsClient, DeliveriesLocation, DeliveryDetails, DeliveryDetailsOffice, DeliveryHistoryAsClient, DeliveryOnGoing, HistoryDelivery, ReviewAsClient, ReviewAsDeliveryPerson, ShipmentHistoryRequest, ShipmentListItem, SubscriptionForClient } from "./types";
import { Subscription } from "src/common/entities/subscription.entity";
import axios from "axios";
import { Merchant } from "src/common/entities/merchant.entity";
import { CreateShipmentTrolleyDTO } from "./dto/create-trolley.dto";


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

        @InjectRepository(DeliveryCommission)
        private readonly deliveryCommissionRepository: Repository<DeliveryCommission>,

        @InjectRepository(Subscription)
        private readonly subscriptionRepository: Repository<Subscription>,

        @InjectRepository(Merchant)
        private readonly merchantRepository: Repository<Merchant>,

        @InjectModel(Message.name) private messageModel: Model<Message>,
        

        private readonly stripeService : StripeService,
        private readonly minioService: MinioService, 
    ) {}

    async createDelivery(createShipmentDTO: CreateShipmentDTO, files: Express.Multer.File[], user_id: string) {
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
            deadline_date: createShipmentDTO.shipment.deadline_date ? new Date(createShipmentDTO.shipment.deadline_date) : undefined,
            time_slot: createShipmentDTO.shipment.time_slot,
            urgent: createShipmentDTO.shipment.urgent === 'true',
            status: createShipmentDTO.shipment.status,
            departure_city: createShipmentDTO.shipment.departure_city,
            arrival_city: createShipmentDTO.shipment.arrival_city,
            image: "https://static.vecteezy.com/ti/vecteur-libre/p1/5720408-icone-image-croisee-image-non-disponible-supprimer-symbole-vecteur-image-gratuit-vectoriel.jpg",
            user: user,
            delivery_mail: createShipmentDTO.shipment.delivery_mail,
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
    
        const imageFile = files.find(file => file.fieldname === 'shipment[img]');
        if (imageFile) {
            const fileExtension = path.extname(imageFile.originalname);
            const uniqueFileName = `${uuidv4()}${fileExtension}`;
            const filePath = `shipments/${savedShipment.shipment_id}/${uniqueFileName}`;
            await this.minioService.uploadFileToBucket('client-images', filePath, imageFile);
    
            savedShipment.image = filePath;
            await this.shipmentRepository.save(savedShipment);
        }
    
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

    async createTrolleyShipment(createShipmentDTO: CreateShipmentTrolleyDTO, files: Express.Multer.File[], user_id: string) {
        if (!user_id) {
            throw new Error("User ID is required.");
        }
    
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ['merchant'],
        });
        if (!user) {
            throw new Error("User not found.");
        }
    
        const merchant = user.merchant;
        if (!merchant) {
            throw new Error("Merchant not found.");
        }
    
        const address = `${merchant.address}, ${merchant.postal_code} ${merchant.city}`;
        const response = await axios.get(`https://nominatim.openstreetmap.org/search`, {
            params: {
                q: address,
                format: 'json',
                limit: 1,
            },
        });

    
        if (response.data.length === 0) {
            throw new Error("Unable to retrieve coordinates for the merchant's address.");
        }
    
        const departureLatitude = parseFloat(response.data[0].lat);
        const departureLongitude = parseFloat(response.data[0].lon);
    
        const shipment = this.shipmentRepository.create({
            description: createShipmentDTO.shipment.description,
            estimated_total_price: Number(createShipmentDTO.shipment.estimated_total_price),
            proposed_delivery_price: Number(createShipmentDTO.shipment.proposed_delivery_price),
            weight: parseFloat(createShipmentDTO.shipment.weight ?? "0"),
            volume: parseFloat(createShipmentDTO.shipment.volume ?? "0"),
            deadline_date: createShipmentDTO.shipment.deadline_date ? new Date(createShipmentDTO.shipment.deadline_date) : undefined,
            time_slot: createShipmentDTO.shipment.time_slot,
            urgent: createShipmentDTO.shipment.urgent === 'true',
            status: createShipmentDTO.shipment.status,
            departure_city: merchant.city,
            arrival_city: createShipmentDTO.shipment.arrival_city,
            image: "https://static.vecteezy.com/ti/vecteur-libre/p1/5720408-icone-image-croisee-image-non-disponible-supprimer-symbole-vecteur-image-gratuit-vectoriel.jpg",
            user: user,
            delivery_mail: createShipmentDTO.shipment.delivery_mail,
            trolleydrop: true,
        });
    
        if (!isNaN(departureLatitude) && !isNaN(departureLongitude)) {
            shipment.departure_location = {
                type: 'Point',
                coordinates: [departureLongitude, departureLatitude],
            };
        }
    
        const arrivalLatitude = parseFloat(createShipmentDTO.shipment.arrival_location.latitude);
        const arrivalLongitude = parseFloat(createShipmentDTO.shipment.arrival_location.longitude);
    
        if (!isNaN(arrivalLatitude) && !isNaN(arrivalLongitude)) {
            shipment.arrival_location = {
                type: 'Point',
                coordinates: [arrivalLongitude, arrivalLatitude],
            };
        }
    
        const savedShipment = await this.shipmentRepository.save(shipment);
    
        const imageFile = files.find(file => file.fieldname === 'shipment[img]');
        if (imageFile) {
            const fileExtension = path.extname(imageFile.originalname);
            const uniqueFileName = `${uuidv4()}${fileExtension}`;
            const filePath = `shipments/${savedShipment.shipment_id}/${uniqueFileName}`;
            await this.minioService.uploadFileToBucket('client-images', filePath, imageFile);
    
            savedShipment.image = filePath;
            await this.shipmentRepository.save(savedShipment);
        }
    
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
        const queryBuilder = this.shipmentRepository.createQueryBuilder("shipment")
            .leftJoinAndSelect("shipment.deliveries", "deliveries")
            .leftJoinAndSelect("shipment.stores", "stores")
            .leftJoinAndSelect("stores.exchangePoint", "exchangePoint");
    
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
    
        queryBuilder.andWhere("NOT EXISTS (SELECT 1 FROM deliveries WHERE deliveries.shipment_id = shipment.shipment_id AND (deliveries.shipment_step = 0 OR deliveries.shipment_step = 1000))");
    
        if (filters.page && filters.limit) {
            const offset = (filters.page - 1) * filters.limit;
            queryBuilder.skip(offset).take(filters.limit);
        }
    
        const shipments = await queryBuilder.getMany();
    
        const updatedShipments = await Promise.all(shipments.map(async (shipment) => {
            const deliveries = shipment.deliveries.sort((a, b) => a.shipment_step - b.shipment_step);
            const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);
    
            let departureCity = shipment.departure_city;
            let departureLocation = shipment.departure_location;
            let arrivalCity = shipment.arrival_city;
            let arrivalLocation = shipment.arrival_location;
    
            if (deliveries.length > 0) {
                const lastDelivery = deliveries[deliveries.length - 1];
                if (lastDelivery.shipment_step !== 1000) {
                    const lastStore = storesByStep.find(s => s.step === lastDelivery.shipment_step);
                    departureCity = lastStore?.exchangePoint?.city ?? shipment.departure_city;
                    departureLocation = lastStore?.exchangePoint?.coordinates ?? shipment.departure_location;
                }
    
                if (lastDelivery.shipment_step === 1000) {
                    arrivalCity = shipment.arrival_city;
                    arrivalLocation = shipment.arrival_location;
                } else {
                    const nextStore = storesByStep.find(s => s.step === lastDelivery.shipment_step + 1);
                    arrivalCity = nextStore?.exchangePoint?.city ?? shipment.arrival_city;
                    arrivalLocation = nextStore?.exchangePoint?.coordinates ?? shipment.arrival_location;
                }
            }
    
            // Générer l'URL de l'image du shipment
            const shipmentImageUrl = shipment.image ? await this.minioService.generateImageUrl("client-images", shipment.image) : null;
    
            return {
                ...shipment,
                departure_city: departureCity,
                departure_location: departureLocation,
                arrival_city: arrivalCity,
                arrival_location: arrivalLocation,
                image: shipmentImageUrl, // Ajouter l'URL de l'image ici
            };
        }));
    
        return updatedShipments;
    }

    async getShipmentById(id: string): Promise<any> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: id },
            relations: [
                'parcels',
                'parcels.images',
                'deliveries',
                'deliveries.delivery_person',
                'deliveries.delivery_person.user',
                'stores',
                'stores.exchangePoint',
                'user',
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
        const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);
    
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
            idLink?: string;
        }[] = [];
    
        if (deliveries.length === 0) {
            steps.push({
                id: -1,
                title: 'No Steps',
                description: 'Aucune étape de livraison n\'existe.',
                date: undefined,
                departure: {
                    city: null,
                    coordinates: null,
                },
                arrival: {
                    city: null,
                    coordinates: null,
                },
                courier: null,
                idLink: undefined,
            });
        } else {
            for (let i = 0; i < deliveries.length; i++) {
                const delivery = deliveries[i];
                const store = storesByStep.find(s => s.step === delivery.shipment_step);
                const courier = delivery.delivery_person;
    
                let departureCity, departureCoords, arrivalCity, arrivalCoords;
    
                if (delivery.shipment_step === 1) {
                    departureCity = shipment.departure_city;
                    departureCoords = shipment.departure_location?.coordinates?.slice().reverse();
                    arrivalCity = store?.exchangePoint?.city;
                    arrivalCoords = store?.exchangePoint?.coordinates.coordinates?.slice().reverse();
                } else {
                    const prevStore = storesByStep.find(s => s.step === delivery.shipment_step - 1);
                    departureCity = prevStore?.exchangePoint?.city;
                    departureCoords = prevStore?.exchangePoint?.coordinates.coordinates?.slice().reverse();
                    arrivalCity = store?.exchangePoint?.city;
                    arrivalCoords = store?.exchangePoint?.coordinates.coordinates?.slice().reverse();
                }
    
                let clientOrMerchant;
                if (shipment.user.clients.length > 0) {
                    clientOrMerchant = shipment.user.clients[0];
                } else if (shipment.user.merchant) {
                    clientOrMerchant = shipment.user.merchant[0];
                }
    
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
                        name: clientOrMerchant ? `${clientOrMerchant.first_name} ${clientOrMerchant.last_name}` : "Unknown",
                        photoUrl: courier?.user.profile_picture || null,
                    },
                });
            }
    
            const finalDelivery = deliveries.find(delivery => delivery.shipment_step === 1000);
            if (finalDelivery) {
                const lastStore = storesByStep.find(s => s.step === finalDelivery.shipment_step - 1);
    
                let clientOrMerchant;
                if (shipment.user.clients.length > 0) {
                    clientOrMerchant = shipment.user.clients[0];
                } else if (shipment.user.merchant) {
                    clientOrMerchant = shipment.user.merchant[0];
                }
    
                steps.push({
                    id: 1000,
                    title: 'Step finale',
                    description: 'Dernière étape de la livraison jusqu’au destinataire.',
                    date: finalDelivery.send_date?.toISOString(),
                    departure: {
                        city: lastStore?.exchangePoint?.city || "",
                        coordinates: lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse(),
                    },
                    arrival: {
                        city: shipment.arrival_city,
                        coordinates: shipment.arrival_location?.coordinates?.slice().reverse(),
                    },
                    courier: {
                        name: clientOrMerchant ? `${clientOrMerchant.first_name} ${clientOrMerchant.last_name}` : "Unknown",
                        photoUrl: clientOrMerchant?.user.profile_picture || null,
                    },
                });
            }
        }
    
        let realArrivalCity = shipment.arrival_city;
        let realArrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse();
    
        if (deliveries.length > 0) {
            const lastDelivery = deliveries[deliveries.length - 1];
            if (lastDelivery.shipment_step === 1000) {
                realArrivalCity = shipment.arrival_city;
                realArrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse();
            } else {
                const lastStore = storesByStep.find(s => s.step === lastDelivery.shipment_step);
                realArrivalCity = lastStore?.exchangePoint?.city ?? shipment.arrival_city;
                realArrivalCoords = lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() ?? shipment.arrival_location?.coordinates?.slice().reverse();
            }
        }
    
        let finished = false;
        if (deliveries.some(delivery => delivery.shipment_step === 0)) {
            finished = true;
        }
    
        const result = {
            details: {
                id: shipment.shipment_id,
                name: shipment.description,
                departure: {
                    city: shipment.departure_city,
                    coordinates: shipment.departure_location?.coordinates?.slice().reverse(),
                },
                arrival: {
                    city: realArrivalCity,
                    coordinates: realArrivalCoords,
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
                urgent : shipment.urgent,
                finished : finished,
                trolleydrop : shipment.trolleydrop,
            },
            package: parcels,
            steps: steps,
        };
    
        return result;
    }

    async bookShipment(id: string, user_id: string): Promise<Delivery> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id: id },
            relations: ['deliveries', 'stores', 'stores.exchangePoint'],
        });
    
        if (!shipment) {
            throw new Error('Shipment not found.');
        }
    
        const user = await this.userRepository.findOne({
            where: { user_id },
            relations: ['deliveryPerson'],
        });
    
        if (!user || !user.deliveryPerson) {
            throw new Error('User or delivery person profile not found.');
        }
    
        const existingSteps = shipment.deliveries.map(d => d.shipment_step);
        const isFinalStep = existingSteps.includes(1000);
        const shipment_step = isFinalStep ? 1000 : 0;
    
        const reverseCoords = (point: any) => {
            if (!point || !point.coordinates) return null;
            return [...point.coordinates].reverse();
        };
    
        const departureCoords = reverseCoords(shipment.departure_location);
        const arrivalCoords = reverseCoords(shipment.arrival_location);
    
        console.log("DEPARTURE:", departureCoords);
        console.log("ARRIVAL:", arrivalCoords);
    
        const commissions = await this.deliveryCommissionRepository.findOne({ where: {} });
    
        let existingDelivery = await this.deliveryRepository.findOne({
            where: { shipment: { shipment_id: id } },
            relations: ['shipment'],
        });
    
        let delivery_code: string;
    
        if (existingDelivery && existingDelivery.delivery_code) {
            delivery_code = existingDelivery.delivery_code;
        } else {
            delivery_code = crypto.randomBytes(16).toString('hex');
        }
    
        const qrCodeBase64 = await QRCode.toDataURL(delivery_code);
    
        console.log("Delivery Code:", delivery_code);
        console.log("QR Code Base64:", qrCodeBase64);
    
        const delivery = this.deliveryRepository.create({
            send_date: new Date(),
            status: 'pending',
            amount: shipment.proposed_delivery_price ?? 0,
            shipment: shipment,
            delivery_person: user.deliveryPerson,
            shipment_step,
            delivery_commission: commissions ?? undefined,
            delivery_code,
        });
    
        const savedDelivery = await this.deliveryRepository.save(delivery);
        return savedDelivery;
    }
    
    async bookPartial(dto: BookPartialDTO, shipment_id: string): Promise<Delivery> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id },
            relations: ['stores', 'stores.exchangePoint'],
        });
    
        if (!shipment) {
            throw new Error('Shipment not found.');
        }
    
        const user = await this.userRepository.findOne({
            where: { user_id: dto.delivery_person_id },
            relations: ['deliveryPerson'],
        });
    
        if (!user || !user.deliveryPerson) {
            throw new Error('User or delivery person profile not found.');
        }
    
        const existingSteps = shipment.stores.map((store) => store.step);
        const nextStep = existingSteps.length > 0 ? Math.max(...existingSteps) + 1 : 1;
    
        let exchangePoint: ExchangePoint;
    
        if (dto.warehouse_id) {
            const warehouse = await this.warehouseRepository.findOne({
                where: { warehouse_id: dto.warehouse_id },
            });
    
            if (!warehouse) {
                throw new Error('Warehouse not found.');
            }
    
            exchangePoint = this.exchangePointRepository.create({
                city: warehouse.city,
                coordinates: warehouse.coordinates,
                warehouse_id: warehouse.warehouse_id,
            });
    
            await this.exchangePointRepository.save(exchangePoint);
        } else if (dto.city && dto.latitude && dto.longitude) {
            exchangePoint = this.exchangePointRepository.create({
                city: dto.city,
                coordinates: {
                    type: 'Point',
                    coordinates: [dto.longitude, dto.latitude],
                },
                warehouse_id: undefined,
            });
    
            await this.exchangePointRepository.save(exchangePoint);
        } else {
            throw new Error('You must provide either a warehouse_id or city, latitude, and longitude.');
        }
    
        let startDate: Date;
        if (shipment.stores.length > 0) {
            const lastStep = shipment.stores[shipment.stores.length - 1];
            startDate = lastStep.end_date || new Date();
        } else {
            startDate = shipment.deadline_date || new Date();
        }
    
        const endDate = dto.end_date || undefined;
    
        const store = this.storeRepository.create({
            exchangePoint,
            step: nextStep,
            start_date: startDate,
            end_date: endDate,
            shipment_id: shipment.shipment_id,
        });
    
        await this.storeRepository.save(store);
    
        shipment.proposed_delivery_price = dto.new_price;
    
        const delivery_code = crypto.createHmac('sha256', 'secret').update(shipment.shipment_id).digest('hex');
    
        const commissions = await this.deliveryCommissionRepository.findOne({ where: {} });
    
        const delivery = this.deliveryRepository.create({
            send_date: new Date(),
            status: 'pending',
            amount: dto.price,
            shipment: shipment,
            delivery_person: user.deliveryPerson,
            shipment_step: nextStep,
            delivery_commission: commissions ?? undefined,
            delivery_code,
        });
    
        return await this.deliveryRepository.save(delivery);
    }

    async askToNegociate(shipment_id: string, user_id: string): Promise<{ message: string }> {
        const shipment = await this.shipmentRepository.findOne({
            where: { shipment_id },
            relations: ["user"]
        });
        if (!shipment) {
            throw new Error("Delivery not found.");
        }
    
        const deliverPerson = await this.deliveryPersonRepository.findOne({
            where: { user: { user_id } },
            relations: ["user"],
        });
        if (!deliverPerson) {
            throw new Error("Delivery person not found.");
        }
    
        const client_id = shipment.user.user_id;
    
        const client = await this.clientRepository.findOne({
            where: { user: { user_id: client_id } },
            relations: ["user"],
        });
        if (!client) {
            throw new Error("Client not found.");
        }
    
        const deliveryName = shipment.description || "votre demande de livraison";
        const messageContent = `Bonjour, je serais intéressé pour effectuer la livraison de "${deliveryName}", mais je ne pourrais en assurer l'intégralité. Seriez-vous intéressé pour que j'assure une partie ?`;
    
        const newMessage = new this.messageModel({
            senderId: deliverPerson.user.user_id,
            receiverId: client_id,
            content: messageContent
        });
        await newMessage.save();
    
        return { message: "Negotiation request sent successfully." };
    }

    async getWarehouseList(): Promise<Warehouse[]> {
        const warehouses = await this.warehouseRepository.find({where : {}});
        
        return warehouses;
    }

    async getMyCurrentShipmentsForNegoctation(user_id: string): Promise<Shipment[]> {
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
        });
    
        if (!user) {
            throw new Error("User or delivery person profile not found.");
        }
    
        const shipments = await this.shipmentRepository.find({
            where: {
                user: { user_id: user.user_id },
                status: "pending"
            },
            relations: ["deliveries", "stores", "stores.exchangePoint"],
        });
    
        return shipments;
    }

    async takeDeliveryPackage(deliveryId : string, user_id : string, secretCode : string) : Promise<{ message: string }> {
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment", "delivery_person.user", "shipment.stores", "shipment.stores.exchangePoint"],
        });

        if (!delivery) {
            throw new Error("Delivery not found.");
        }

        if (delivery.delivery_person.user.user_id !== user_id) {
            throw new Error("User is not authorized to take this delivery.");
        }

        if (delivery.status === 'finished') {
            throw new Error("Cannot take a finished delivery.");
        }

        if (delivery.status === 'validated') {
            throw new Error("Cannot take a validated delivery.");
        }

        if (delivery.delivery_code !== secretCode) {
            throw new Error("Invalid secret code.");
        }

        delivery.status = 'taken';
        await this.deliveryRepository.save(delivery);
        
        return { message: "Delivery taken successfully." };
    }

    async finishDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment", "shipment.stores", "shipment.stores.exchangePoint", "delivery_person.user"],
        });
    
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
    
        if (delivery.status != 'taken') {
            throw new Error("Delivery is not in a state that allows it to be finished.");
        }
    
        if (delivery.delivery_person.user.user_id !== user_id) {
            throw new Error("User is not authorized to finish this delivery.");
        }
    
        delivery.status = 'finished';    
        const secretCode = Math.floor(100000 + Math.random() * 900000).toString();
        delivery.end_code = secretCode;
    
        await this.deliveryRepository.save(delivery);
    
        const currentStep = delivery.shipment_step;
        const currentStore = delivery.shipment.stores.find(store => store.step === currentStep);
    
        if (currentStep === 0 || currentStep === 1000) {
            console.log(`Email to: ${delivery.shipment.delivery_mail}, Code: ${secretCode}`);
        } else if (currentStore) {
            if (currentStore.exchangePoint.warehouse_id) {
                console.log(`Email to: ecodeli@gmail.com, Code: ${secretCode}`);
            } else if (currentStore.exchangePoint.isbox) {
                console.log(`Code for box: ${secretCode}`);
            } else {
                const nextStepStore = delivery.shipment.stores.find(store => store.step === currentStep + 1);
                if (nextStepStore) {
                    const nextDelivery = await this.deliveryRepository.findOne({
                        where: { shipment: { shipment_id: delivery.shipment.shipment_id }, shipment_step: currentStep + 1 },
                        relations: ["delivery_person"]
                    });
                    if (nextDelivery) {
                        console.log(`Code sent to delivery person of next step: ${nextDelivery.delivery_person.professional_email}, Code: ${secretCode}`);
                    } else {
                        console.log(`Code: ${secretCode}`);
                        console.log(`Email to: personne`);
                    }
                } else {
                    console.log(`Code: ${secretCode}`);
                    console.log(`Email to: personne`);
                }
            }
        } else {
            console.log(`Code: ${secretCode}`);
            console.log(`Email to: personne`);
        }
    
        return { message: "Delivery finished successfully." };
    }

    async validateDeliveryWithCode(deliveryId: string, user_id: string, code: string): Promise<{ message: string }> {

    
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment", "shipment.stores", "shipment.stores.exchangePoint", "delivery_person.user"],
        });
    
        if (!delivery) {
            throw new Error("Delivery not found.");
        }
    
        if (delivery.status != 'finished') {
            throw new Error("Delivery is not in a state that allows it to be validated.");
        }
    
        if (delivery.end_code !== code) {
            throw new Error("Invalid code.");
        }
    
        if (delivery.delivery_person.user.user_id !== user_id) {
            throw new Error("User is not authorized to validate this delivery.");
        }
    
        delivery.status = 'validated';
        await this.deliveryRepository.save(delivery);
    
        const delivery_step = delivery.shipment_step;
    
        if (delivery_step === 0 || delivery_step === 1000) {
            await this.shipmentRepository.update(delivery.shipment.shipment_id, {
                status: 'validated',
            });
        }
    
        return { message: "Delivery validated successfully." };
    }

    async validateDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {

        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment"],
        });

        if (!delivery) {
            throw new Error("Delivery not found.");
        }

        if (delivery.status != 'finished'){
            throw new Error("Delivery is not in a state that allows it to be validated.");
        }

        if (delivery.shipment.user.user_id !== user_id) {
            throw new Error("User is not authorized to validate this delivery.");
        }

        delivery.status = 'validated';
        await this.deliveryRepository.save(delivery);

        const delivery_step = delivery.shipment_step;

        if (delivery_step === 0 || delivery_step === 1000) {
            await this.shipmentRepository.update(delivery.shipment.shipment_id, {
                status: 'validated',
            });
        }
        
        return { message: "Delivery validated successfully." };
    }

    async getOngoingDeliveries(user_id: string): Promise<DeliveryOnGoing[]> {
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ['deliveryPerson'],
        });

        if (!user || !user.deliveryPerson) {
            throw new Error('User or delivery person profile not found.');
        }

        const deliveries = await this.deliveryRepository.find({
            where: {
                delivery_person: { delivery_person_id: user.deliveryPerson.delivery_person_id },
                status: In(['taken', 'pending', 'finished']),
            },
            relations: ['shipment', 'shipment.stores', 'shipment.stores.exchangePoint'],
        });

        const ongoingDeliveries: DeliveryOnGoing[] = deliveries.map(delivery => {
            const shipment = delivery.shipment;
            const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);

            let currentCoordinates: [number, number] = [0, 0];
            let progress = 0;

            if (delivery.shipment_step === 0) {
                currentCoordinates = shipment.departure_location.coordinates.slice().reverse() as [number, number];
                progress = 0;
            } else if (delivery.shipment_step === 1000) {
                currentCoordinates = shipment.arrival_location.coordinates.slice().reverse() as [number, number];
                progress = 100;
            } else {
                const currentStore = storesByStep.find(store => store.step === delivery.shipment_step);
                if (currentStore) {
                    currentCoordinates = currentStore.exchangePoint.coordinates.coordinates.slice().reverse() as [number, number];
                    progress = (delivery.shipment_step / 1000) * 100;
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
                    current: currentCoordinates,
                },
                progress: progress,
            };
        });

        return ongoingDeliveries;
    }

    async getMyDeliveryHistory(user_id: string, page: number, limit: number): Promise<{ data: HistoryDelivery[], totalRows: number }> {
        const pageNumber = typeof page === 'number' ? page : 1;
        const pageSize = typeof limit === 'number' ? limit : 10;
    
        console.log("user_id", user_id);
    
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
            relations: ['deliveryPerson'],
        });
    
        if (!user || !user.deliveryPerson) {
            throw new Error('User or delivery person profile not found.');
        }
    
        const [deliveries, total] = await this.deliveryRepository.findAndCount({
            where: {
                delivery_person: { delivery_person_id: user.deliveryPerson.delivery_person_id },
            },
            relations: ['shipment', 'shipment.stores', 'shipment.stores.exchangePoint', 'shipment.user'],
            skip: (pageNumber - 1) * pageSize,
            take: pageSize,
            order: { send_date: 'DESC' },
        });
    
        const historyDeliveries: HistoryDelivery[] = await Promise.all(
            deliveries.map(async (delivery) => {
                const shipment = delivery.shipment;
                const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);
    
                let departureCity, arrivalCity;
    
                if (delivery.shipment_step === 0) {
                      departureCity = shipment.departure_city ?? "Unknown";
                    arrivalCity = shipment.arrival_city;
                } else if (delivery.shipment_step === 1000) {
                    const lastStore = storesByStep[storesByStep.length - 1];
                    departureCity = lastStore?.exchangePoint?.city ?? shipment.departure_city;
                    arrivalCity = shipment.arrival_city;
                } else {
                    const currentStore = storesByStep.find(store => store.step === delivery.shipment_step);
                    const previousStore = storesByStep.find(store => store.step === delivery.shipment_step - 1);
                    departureCity = previousStore?.exchangePoint?.city ?? shipment.departure_city;
                    arrivalCity = currentStore?.exchangePoint?.city ?? shipment.arrival_city;
                }
    
                const client = await this.clientRepository.findOne({
                    where: { user: { user_id: shipment.user.user_id } },
                    relations: ['user'],
                });
    
                return {
                    id: delivery.delivery_id,
                    departure_city: departureCity,
                    arrival_city: arrivalCity,
                    price: delivery.amount,
                    client: {
                        name: client ? `${client.first_name} ${client.last_name}` : "Unknown",
                        photo_url: client?.user?.profile_picture || "",
                    },
                    status: delivery.status,
                };
            })
        );
    
        return { data: historyDeliveries, totalRows: total };
    }

    async getReviewsForDeliveryPerson(user_id: string, page: number = 1, limit: number = 10): Promise<{ data: ReviewAsDeliveryPerson[], totalRows: number }> {
        const [deliveries, total] = await this.deliveryRepository.findAndCount({
            where: {
                delivery_person: { user: { user_id: user_id } },
                status: 'validated',
            },
            relations: ['deliveryReviews', 'deliveryReviews.responses', 'shipment', 'shipment.user', 'shipment.user.clients', 'shipment.user.merchant'],
            skip: (page - 1) * limit,
            take: limit,
        });
    
        const reviews: ReviewAsDeliveryPerson[] = [];
    
        for (const delivery of deliveries) {
            let clientOrMerchant;
            if (delivery.shipment.user.clients.length > 0) {
                clientOrMerchant = delivery.shipment.user.clients[0];
            } else if (delivery.shipment.user.merchant) {
                clientOrMerchant = delivery.shipment.user.merchant[0];
            }
    
            for (const review of delivery.deliveryReviews) {
                const response = review.responses.length > 0 ? review.responses[0] : null;
    
                reviews.push({
                    id: review.review_id,
                    content: review.comment || '',
                    author: {
                        id: delivery.shipment.user.user_id,
                        name: clientOrMerchant ? `${clientOrMerchant.first_name} ${clientOrMerchant.last_name}` : "Unknown",
                        photo: delivery.shipment.user.profile_picture || '',
                    },
                    reply: response ? true : false,
                    reply_content: response ? response.comment : null,
                    delivery_name: delivery.shipment.description || '',
                    rate: review.rating,
                });
            }
        }
    
        return { data: reviews, totalRows: total };
    }

    async replyComment(comment: string, userId: string, commentId: string): Promise<{ message: string }> {
        
    
        const deliveryReview = await this.deliveryReviewRepository.findOne({
            where: { review_id: commentId },
            relations: ["responses", "delivery"],
        });
    
        if (!deliveryReview) {
            throw new Error("Comment not found.");
        }

        console.log("Delivery Review:", deliveryReview);

        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryReview.delivery.delivery_id },
            relations: ["delivery_person", "shipment", "shipment.user", "delivery_person.user"],
        });
        if (!delivery) {
            throw new Error("Delivery not found.");
        }

        if (delivery.delivery_person.user.user_id !== userId) {
            throw new Error("User is not authorized to reply to this comment.");
        }
    
        const deliveryReviewResponse = new DeliveryReviewResponse();
        deliveryReviewResponse.comment = comment;
        deliveryReviewResponse.review = deliveryReview;
    
        await this.deliveryReviewResponseRepository.save(deliveryReviewResponse);
    
        return {message: "Comment replied successfully"}
    }

    async getMyReviewsAsClient(user_id: string, page: number = 1, limit: number = 10): Promise<{ data: ReviewAsClient[], totalRows: number }> {
        const [deliveries, total] = await this.deliveryRepository.findAndCount({
            where: {
                shipment: { user: { user_id: user_id } },
                status: 'validated',
            },
            relations: ['deliveryReviews', 'deliveryReviews.responses', 'delivery_person', 'delivery_person.user', 'delivery_person.user.clients'],
            skip: (page - 1) * limit,
            take: limit,
        });
    
        const reviews: ReviewAsClient[] = [];
    
        for (const delivery of deliveries) {
            const deliveryPerson = delivery.delivery_person.user;
            const client = deliveryPerson.clients.find(client => client.user.user_id === deliveryPerson.user_id);
    
            for (const review of delivery.deliveryReviews) {
                reviews.push({
                    id: review.review_id,
                    content: review.comment || '',
                    delivery: {
                        id: delivery.delivery_id,
                        deliveryman: {
                            id: deliveryPerson.user_id,
                            name: `${client?.first_name || ''} ${client?.last_name || ''}`,
                            photo: deliveryPerson.profile_picture || '',
                            email: deliveryPerson.email || '',
                        },
                    },
                    services_name: delivery.shipment.description || '',
                    rate: review.rating,
                });
            }
        }
    
        return { data: reviews, totalRows: total };
    }

    async getDeliveriesLocation(user_id: string): Promise<DeliveriesLocation[]> {
        const user = await this.userRepository.findOne({
            where: { user_id: user_id },
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
                    status: In(['taken', 'finished']),
                },
                relations: ['delivery_person', 'delivery_person.user', 'delivery_person.user.clients'],
            });
    
            return deliveries.map(delivery => {
                const deliveryPersonClient = delivery.delivery_person?.user.clients[0];
                return {
                    id: delivery.delivery_id,
                    coordinates: {
                        lat: shipment.departure_location.coordinates[1],
                        lng: shipment.departure_location.coordinates[0],
                    },
                    deliveryman: delivery.delivery_person ? {
                        id: delivery.delivery_person.user.user_id,
                        name: `${deliveryPersonClient?.first_name} ${deliveryPersonClient?.last_name}`,
                        photo: delivery.delivery_person.user.profile_picture,
                        email: delivery.delivery_person.user.email,
                    } : undefined,
                    potential_address: shipment.arrival_location.address,
                };
            });
        });
    
        const deliveries = (await Promise.all(deliveriesPromises)).flat();
    
        return deliveries;
    }

    async getCurrentDeliveriesAsClient(user_id: string): Promise<CurrentDeliveryAsClient[]> {
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

    async getShipmentDetails(shipment_id: string): Promise<DeliveryDetailsOffice> {
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
    
        const result: DeliveryDetailsOffice = {
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

    async getSubscriptionPlanForClient(user_id: string): Promise<SubscriptionForClient> {

        const user = await this.userRepository.findOne({ where: { user_id } });
        if (!user) {
            throw new Error('User not found');
        }
    
        const subscription = await this.subscriptionRepository.findOne({
            where: { user: user, status: 'active' },
            relations: ['plan']
        });
    
        if (!subscription) {
            return {
                planName: "Free",
                priorityRate: 0.15,
                insuranceLimit: null,
                additionalInsuranceCost: null,
            }
        }
    
        const subscriptionForClient: SubscriptionForClient = {
            planName: subscription.plan.name,
            discountRate: subscription.plan.shipping_discount,
            priorityRate: subscription.plan.priority_shipping_percentage,
            insuranceLimit: subscription.plan.max_insurance_coverage,
            additionalInsuranceCost: subscription.plan.extra_insurance_price,
            freeShipmentAvailable: subscription.plan.first_shipping_free,
            freePriorityShipmentsPerMonth: subscription.plan.priority_months_offered,
            freePriotiryShipmentsIfLower: subscription.plan.first_shipping_free_threshold,
            permanentDiscount: subscription.plan.permanent_discount,
            hasUsedFreeShipment: false, 
            remainingPriorityShipments: subscription.plan.priority_months_offered
        };
    
        return subscriptionForClient;
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
                            coordinates: shipment.departure_location?.coordinates ? [shipment.departure_location.coordinates[1], shipment.departure_location.coordinates[0]] : [0, 0],
                        },
                        arrival: {
                            city: shipment.arrival_city,
                            coordinates: shipment.arrival_location?.coordinates ? [shipment.arrival_location.coordinates[1], shipment.arrival_location.coordinates[0]] : [0, 0],
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

    async getMyShipmentsHistory(userId: string, page: number, limit: number): Promise<{ data: ShipmentHistoryRequest[], totalRows: number }> {
        const offset = (page - 1) * limit;
    
        const shipments = await this.shipmentRepository.find({
            where: { user: { user_id: userId }, status: 'validated' },
            relations: ['parcels', 'deliveries'],
            skip: offset,
            take: limit,
        });
    
        const total = await this.shipmentRepository.count({
            where: { user: { user_id: userId }, status: 'validated' },
        });
    
        const shipmentRequests: ShipmentHistoryRequest[] = await Promise.all(
            shipments.map(async (shipment) => {
                try {
                    const parcels = await this.parcelRepository.find({ where: { shipment: { shipment_id: shipment.shipment_id } } });
                    const deliveries = await this.deliveryRepository.find({ where: { shipment: { shipment_id: shipment.shipment_id } } });
    
                    return {
                        id: shipment.shipment_id,
                        name: shipment.description ?? "Unnamed Shipment",
                        departureCity: shipment.departure_city,
                        arrivalCity: shipment.arrival_city,
                        urgent: shipment.urgent,
                        nbColis: parcels.length,
                        nbLivraisons: deliveries.length,
                    };
                } catch (error) {
                    console.error(`Error processing shipment ${shipment.shipment_id}:`, error);
                    return null;
                }
            })
        ).then(items => items.filter(item => item !== null)) as ShipmentHistoryRequest[];
    
        return {
            data: shipmentRequests,
            totalRows: total,
        };
    }

    async getDeliveryHistoryAsClient(
        user_id: string,
        page: number,
        limit: number
      ): Promise<{ data: DeliveryHistoryAsClient[]; totalRows: number }> {
        const pageNumber = Number.isInteger(page) ? page : 1;
        const pageSize = Number.isInteger(limit) ? limit : 10;
      
        const [shipments, total] = await this.shipmentRepository.findAndCount({
          where: { user: { user_id } },
          relations: [
            'deliveries',
            'deliveries.delivery_person',
            'deliveries.delivery_person.user',
            'deliveries.delivery_person.user.clients',
            'stores',
            'stores.exchangePoint',
          ],
          skip: (pageNumber - 1) * pageSize,
          take: pageSize,
        });
      
        const deliveryHistory: DeliveryHistoryAsClient[] = await Promise.all(
          shipments.map(async (shipment) => {
            const validatedDeliveries = shipment.deliveries.filter(
              (delivery) => delivery.status === 'validated'
            );
      
            const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);
      
            return Promise.all(
              validatedDeliveries.map(async (delivery) => {
                let departureCity: string;
                let arrivalCity: string;
      
                if (delivery.shipment_step === 0) {
                  departureCity = shipment.departure_city || 'Unknown';
                  arrivalCity = shipment.arrival_city || 'Unknown';
                } else if (delivery.shipment_step === 1000) {
                  const lastStore = storesByStep[storesByStep.length - 1];
                  departureCity = lastStore?.exchangePoint?.city || shipment.departure_city || 'Unknown';
                  arrivalCity = shipment.arrival_city || 'Unknown';
                } else {
                  const currentStore = storesByStep.find(store => store.step === delivery.shipment_step);
                  const previousStore = storesByStep.find(store => store.step === delivery.shipment_step - 1);
                  departureCity = previousStore?.exchangePoint?.city || shipment.departure_city || 'Unknown';
                  arrivalCity = currentStore?.exchangePoint?.city || shipment.arrival_city || 'Unknown';
                }
      
                const deliveryReview = await this.deliveryReviewRepository.findOne({
                  where: { delivery_id: delivery.delivery_id },
                });
      
                const user = delivery.delivery_person?.user;
                const client = user?.clients?.[0];
      
                return {
                  id: delivery.delivery_id,
                  deliveryman: {
                    id: delivery.delivery_person?.delivery_person_id ?? 'unknown',
                    name: client
                      ? `${client.first_name} ${client.last_name}`
                      : 'Non défini',
                    photo: user?.profile_picture || '',
                  },
                  departureDate: delivery.send_date?.toISOString() || '',
                  arrivalDate: delivery.delivery_date?.toISOString() || '',
                  departureCity,
                  arrivalCity,
                  announcementName: shipment.description || '',
                  rate: deliveryReview?.rating ?? null,
                  comment: deliveryReview?.comment ?? null,
                };
              })
            );
          })
        ).then(results => results.flat());
      
        return { data: deliveryHistory, totalRows: total };
    }
    
    async addComment(comment: string, userId: string, deliveryId: string, rate : number): Promise<{ message: string }> {
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["shipment", "shipment.user"],
        });


        if (!delivery) {
            throw new Error("Delivery not found.");
        }


        if (delivery.status !== 'validated') {
            throw new Error("Delivery is not validated.");
        }

        console.log("delivery", delivery);
        console.log("userId", userId);
        console.log("delivery.shipment.user.user_id", delivery.shipment.user.user_id);

        if (delivery.shipment.user.user_id !== userId) {
            throw new Error("User is not authorized to comment on this delivery.");
        }

        const deliveryReview = new DeliveryReview();
        deliveryReview.comment = comment;
        deliveryReview.rating = 0; 
        deliveryReview.delivery = delivery;
        deliveryReview.rating = rate;

        await this.deliveryReviewRepository.save(deliveryReview);

        return {message: "Comment added successfully"};
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
    
    async cancelDelivery(deliveryId: string, user_id: string): Promise<{ message: string }> {
        const delivery = await this.deliveryRepository.findOne({
            where: { delivery_id: deliveryId },
            relations: ["delivery_person", "shipment", "delivery_person.user", "shipment.user"],
        });

        if (!delivery) {
            throw new Error("Delivery not found.");
        }


        if (delivery.delivery_person.user.user_id !== user_id) {
            throw new Error("User is not authorized to cancel this delivery.");
        }

        if (delivery.status === 'taken') {
            throw new Error("Cannot cancel a taken delivery.");
        }

        if (delivery.status === 'finished') {
            throw new Error("Cannot cancel a finished delivery.");
        }

        if (delivery.status === 'validated') {
            throw new Error("Cannot cancel a validated delivery.");
        }

        delivery.status = 'canceled';
        await this.deliveryRepository.save(delivery);


        // Logique plus tard de prévenir les gens




        return { message: "Delivery canceled successfully." };
    }
    

// PAS ENCORE UTILISE







    


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
            amount: updatedAmount,
            send_date: new Date(),
            shipment_step: newStep,
        });
    
        return this.deliveryRepository.save(delivery);
    }

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
            amount: updatedAmount,
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
