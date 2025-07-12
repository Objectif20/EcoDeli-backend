import { CreateShipmentDTO } from './dto/create-shipment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/common/entities/user.entity';
import { Not, Repository } from 'typeorm';
import { Shipment } from 'src/common/entities/shipment.entity';
import { Parcel } from 'src/common/entities/parcels.entity';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { GetShipmentsDTO } from './dto/get-shipment.dto';
import { Point } from 'geojson';
import { CreateShipmentTrolleyDTO } from './dto/create-trolley.dto';
import { MinioService } from 'src/common/services/file/minio.service';
import { ParcelImage } from 'src/common/entities/parcel_images.entity';
import axios from 'axios';
import {
  DeliveryDetailsOffice,
  ShipmentHistoryRequest,
  ShipmentListItem,
  ShipmentWithCoveredSteps,
} from './types';
import { Delivery } from 'src/common/entities/delivery.entity';

export class ShipmentService {
  constructor(
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
    @InjectRepository(Parcel)
    private readonly parcelRepository: Repository<Parcel>,
    @InjectRepository(ParcelImage)
    private readonly parcelImageRepository: Repository<ParcelImage>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,

    private readonly minioService: MinioService,
  ) {}
  async createShipment(
    createShipmentDTO: CreateShipmentDTO,
    files: Express.Multer.File[],
    user_id: string,
  ) {
    if (!user_id) {
      throw new Error('User ID is required.');
    }

    const user = await this.userRepository.findOneBy({ user_id: user_id });
    if (!user) {
      throw new Error('User not found.');
    }

    const shipment = this.shipmentRepository.create({
      description: createShipmentDTO.shipment.description,
      estimated_total_price: Number(createShipmentDTO.shipment.estimated_total_price),
      proposed_delivery_price: Number(createShipmentDTO.shipment.proposed_delivery_price),
      weight: parseFloat(createShipmentDTO.shipment.weight ?? '0'),
      volume: parseFloat(createShipmentDTO.shipment.volume ?? '0'),
      deadline_date: createShipmentDTO.shipment.deadline_date
        ? new Date(createShipmentDTO.shipment.deadline_date)
        : undefined,
      time_slot: createShipmentDTO.shipment.time_slot,
      urgent: createShipmentDTO.shipment.urgent === 'true',
      status: createShipmentDTO.shipment.status,
      departure_city: createShipmentDTO.shipment.departure_city,
      arrival_city: createShipmentDTO.shipment.arrival_city,
      image:
        'https://static.vecteezy.com/ti/vecteur-libre/p1/5720408-icone-image-croisee-image-non-disponible-supprimer-symbole-vecteur-image-gratuit-vectoriel.jpg',
      user: user,
      delivery_mail: createShipmentDTO.shipment.delivery_mail,
      arrival_address: createShipmentDTO.shipment.arrival_address,
      arrival_postal: createShipmentDTO.shipment.arrival_postal_code,
      departure_address: createShipmentDTO.shipment.departure_address,
      departure_postal: createShipmentDTO.shipment.departure_postal_code,
      arrival_handling: createShipmentDTO.shipment.arrival_handling === 'true',
      departure_handling: createShipmentDTO.shipment.departure_handling === 'true',
      floor_arrival_handling: Number(createShipmentDTO.shipment.handling_floor_arrival),
      floor_departure_handling: Number(createShipmentDTO.shipment.handling_floor_departure),
      elevator_arrival: createShipmentDTO.shipment.elevator_arrival === 'true',
      elevator_departure: createShipmentDTO.shipment.elevator_departure === 'true',
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

    const imageFile = files.find((file) => file.fieldname === 'shipment[img]');
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
        const file = files.find((file) => file.fieldname.trim() === imageFieldName);

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

  async createTrolleyShipment(
    createShipmentDTO: CreateShipmentTrolleyDTO,
    files: Express.Multer.File[],
    user_id: string,
  ) {
    if (!user_id) {
      throw new Error('User ID is required.');
    }

    const user = await this.userRepository.findOne({
      where: { user_id: user_id },
      relations: ['merchant'],
    });
    if (!user) {
      throw new Error('User not found.');
    }

    const merchant = user.merchant;
    if (!merchant) {
      throw new Error('Merchant not found.');
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
      weight: parseFloat(createShipmentDTO.shipment.weight ?? '0'),
      volume: parseFloat(createShipmentDTO.shipment.volume ?? '0'),
      deadline_date: createShipmentDTO.shipment.deadline_date
        ? new Date(createShipmentDTO.shipment.deadline_date)
        : undefined,
      time_slot: createShipmentDTO.shipment.time_slot,
      urgent: createShipmentDTO.shipment.urgent === 'true',
      status: createShipmentDTO.shipment.status,
      departure_city: merchant.city,
      arrival_city: createShipmentDTO.shipment.arrival_city,
      image:
        'https://static.vecteezy.com/ti/vecteur-libre/p1/5720408-icone-image-croisee-image-non-disponible-supprimer-symbole-vecteur-image-gratuit-vectoriel.jpg',
      user: user,
      delivery_mail: createShipmentDTO.shipment.delivery_mail,
      trolleydrop: true,
      arrival_address: createShipmentDTO.shipment.arrival_address,
      arrival_postal: createShipmentDTO.shipment.arrival_postal_code,
      departure_address: merchant.address,
      departure_postal: merchant.postal_code,
      arrival_handling: createShipmentDTO.shipment.arrival_handling === 'true',
      departure_handling: false,
      floor_arrival_handling: Number(createShipmentDTO.shipment.handling_floor_arrival),
      floor_departure_handling: 0,
      elevator_arrival: createShipmentDTO.shipment.elevator_arrival === 'true',
      elevator_departure: false,
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

    const imageFile = files.find((file) => file.fieldname === 'shipment[img]');
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
        const file = files.find((file) => file.fieldname.trim() === imageFieldName);

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

  async getShipments(filters: GetShipmentsDTO): Promise<ShipmentWithCoveredSteps[]> {
    const queryBuilder = this.shipmentRepository
      .createQueryBuilder('shipment')
      .leftJoinAndSelect('shipment.deliveries', 'deliveries')
      .leftJoinAndSelect('shipment.stores', 'stores')
      .leftJoinAndSelect('stores.exchangePoint', 'exchangePoint')
      .leftJoin('shipment.user', 'user')
      .leftJoin('user.clients', 'clients')
      .leftJoin('user.merchant', 'merchant')
      .andWhere(
        'EXISTS (SELECT 1 FROM clients WHERE clients.stripe_customer_id IS NOT NULL) OR merchant.stripe_customer_id IS NOT NULL',
      );

    if (filters.latitude && filters.longitude && filters.radius) {
      queryBuilder.andWhere(
        `ST_DWithin(
                        shipment.departure_location::geography,
                        ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                        :radius
                    )`,
        { latitude: filters.latitude, longitude: filters.longitude, radius: filters.radius },
      );
    } else {
      queryBuilder.andWhere(
        `ST_Intersects(
                        shipment.departure_location::geography,
                        ST_SetSRID(ST_MakeEnvelope(-5, 41, 10, 52, 4326), 4326)::geography
                    )`,
      );
    }

    if (
      filters.routeStartLatitude &&
      filters.routeStartLongitude &&
      filters.routeEndLatitude &&
      filters.routeEndLongitude &&
      filters.routeRadius
    ) {
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
          routeRadius: filters.routeRadius,
        },
      );
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere(
        'shipment.estimated_total_price >= :minPrice AND shipment.estimated_total_price IS NOT NULL',
        { minPrice: filters.minPrice },
      );
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere(
        'shipment.estimated_total_price <= :maxPrice AND shipment.estimated_total_price IS NOT NULL',
        { maxPrice: filters.maxPrice },
      );
    }

    if (filters.minWeight !== undefined) {
      queryBuilder.andWhere('shipment.weight >= :minWeight AND shipment.weight IS NOT NULL', {
        minWeight: filters.minWeight,
      });
    }

    if (filters.maxWeight !== undefined) {
      queryBuilder.andWhere('shipment.weight <= :maxWeight AND shipment.weight IS NOT NULL', {
        maxWeight: filters.maxWeight,
      });
    }

    queryBuilder.andWhere(
      'NOT EXISTS (SELECT 1 FROM deliveries WHERE deliveries.shipment_id = shipment.shipment_id AND (deliveries.shipment_step = 0 OR deliveries.shipment_step = 1000))',
    );

    if (filters.page && filters.limit) {
      const offset = (filters.page - 1) * filters.limit;
      queryBuilder.skip(offset).take(filters.limit);
    }

    const shipments = await queryBuilder.getMany();

    const canceledDeliveries = await this.deliveryRepository.find({
      where: { status: 'canceled' },
      relations: ['shipment', 'shipment.stores', 'shipment.stores.exchangePoint'],
    });

    const updatedShipments = await Promise.all(
      shipments.map(async (shipment) => {
        const deliveries = shipment.deliveries.sort((a, b) => a.shipment_step - b.shipment_step);
        const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);

        let departureCity = shipment.departure_city;
        let departureLocation = shipment.departure_location;
        let arrivalCity = shipment.arrival_city;
        let arrivalLocation = shipment.arrival_location;

        const coveredSteps = new Set(
          deliveries.filter((d) => d.status !== 'canceled').map((d) => d.shipment_step),
        );

        const shipmentCanceledDeliveries = canceledDeliveries.filter(
          (d) => d.shipment.shipment_id === shipment.shipment_id,
        );
        const mergedDeliveries: Delivery[] = [];

        shipmentCanceledDeliveries.forEach((canceledDelivery) => {
          const step = canceledDelivery.shipment_step;

          if (coveredSteps.has(step)) {
            return;
          }

          let nextDelivery = canceledDeliveries.find(
            (d) => d.shipment_step === step + 1 && d.shipment.shipment_id === shipment.shipment_id,
          );

          if (!nextDelivery || nextDelivery.status !== 'canceled') {
            mergedDeliveries.push(canceledDelivery);
            coveredSteps.add(step);
          } else {
            let startStep = step;
            let endStep = step;

            while (
              nextDelivery &&
              nextDelivery.status === 'canceled' &&
              !coveredSteps.has(nextDelivery.shipment_step)
            ) {
              endStep = nextDelivery.shipment_step;
              coveredSteps.add(endStep);
              const nextNextDelivery = canceledDeliveries.find(
                (d) =>
                  d.shipment_step === endStep + 1 &&
                  d.shipment.shipment_id === shipment.shipment_id,
              );
              if (!nextNextDelivery || nextNextDelivery.status !== 'canceled') break;
              nextDelivery = nextNextDelivery;
            }

            const mergedDelivery = {
              ...canceledDelivery,
              shipment_step: startStep,
              arrival_city:
                storesByStep.find((s) => s.step === endStep)?.exchangePoint?.city ??
                shipment.arrival_city,
              arrival_location:
                storesByStep.find((s) => s.step === endStep)?.exchangePoint?.coordinates ??
                shipment.arrival_location,
            };

            mergedDeliveries.push(mergedDelivery);
          }
        });

        if (deliveries.length > 0 || mergedDeliveries.length > 0) {
          const lastDelivery =
            deliveries.length > 0
              ? deliveries[deliveries.length - 1]
              : mergedDeliveries[mergedDeliveries.length - 1];
          if (lastDelivery.shipment_step !== 1000) {
            const lastStore = storesByStep.find((s) => s.step === lastDelivery.shipment_step);
            departureCity = lastStore?.exchangePoint?.city ?? shipment.departure_city;
            departureLocation =
              lastStore?.exchangePoint?.coordinates ?? shipment.departure_location;
          }

          if (lastDelivery.shipment_step === 1000) {
            arrivalCity = shipment.arrival_city;
            arrivalLocation = shipment.arrival_location;
          } else {
            const nextStore = storesByStep.find((s) => s.step === lastDelivery.shipment_step + 1);
            arrivalCity = nextStore?.exchangePoint?.city ?? shipment.arrival_city;
            arrivalLocation = nextStore?.exchangePoint?.coordinates ?? shipment.arrival_location;
          }
        }

        const shipmentImageUrl = shipment.image
          ? await this.minioService.generateImageUrl('client-images', shipment.image)
          : null;

        return {
          ...shipment,
          departure_city: departureCity,
          departure_location: departureLocation,
          arrival_city: arrivalCity,
          arrival_location: arrivalLocation,
          image: shipmentImageUrl,
          covered_steps: Array.from(coveredSteps),
        };
      }),
    );

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
        'deliveries.delivery_person.user.clients',
        'stores',
        'stores.exchangePoint',
        'user',
        'user.clients',
        'user.merchant',
      ],
    });

    if (!shipment) throw new Error('Shipment not found');

    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return new Date().toISOString().split('T')[0];
      return `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };

    const parcels = await Promise.all(
      shipment.parcels.map(async (parcel) => ({
        id: parcel.parcel_id,
        name: parcel.name,
        fragility: parcel.fragility,
        estimated_price: Number(parcel.estimate_price),
        weight: Number(parcel.weight),
        volume: Number(parcel.volume),
        picture: await Promise.all(
          parcel.images.map((img) =>
            this.minioService.generateImageUrl('client-images', img.image_url),
          ),
        ),
      })),
    );

    const deliveries = shipment.deliveries.sort((a, b) => a.shipment_step - b.shipment_step);
    const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);

    let totalPrice = Number(
      shipment.proposed_delivery_price ?? shipment.estimated_total_price ?? 0,
    );
    const priceWithStep = deliveries.map((delivery) => ({
      step: `Step ${delivery.shipment_step}`,
      price: Number(delivery.delivery_price ?? delivery.amount),
    }));

    const steps: {
      id: string | number;
      title: string;
      description: string;
      date: string | undefined;
      departure: {
        city: string | null;
        coordinates: any;
        address: string | null;
        postal_code: string | null;
      };
      arrival: {
        city: string | null;
        coordinates: any;
        address: string | null;
        postal_code: string | null;
      };
      courier: { name: string; photoUrl: string | null } | null;
      end_time: string | undefined;
      idLink?: string;
    }[] = [];

    if (deliveries.length === 0) {
      steps.push({
        id: -1,
        title: 'No Steps',
        description: "Aucune étape de livraison n'existe.",
        date: undefined,
        departure: {
          city: shipment.departure_city,
          coordinates: shipment.departure_location?.coordinates?.slice().reverse(),
          address: shipment.departure_address,
          postal_code: shipment.departure_postal,
        },
        arrival: {
          city: shipment.arrival_city,
          coordinates: shipment.arrival_location?.coordinates?.slice().reverse(),
          address: shipment.arrival_address,
          postal_code: shipment.arrival_postal,
        },
        courier: null,
        end_time: undefined,
        idLink: undefined,
      });
    } else {
      for (const delivery of deliveries) {
        const store = storesByStep.find((s) => s.step === delivery.shipment_step);
        const courier = delivery.delivery_person;

        let departure, arrival;

        if (delivery.shipment_step === 1) {
          departure = {
            city: shipment.departure_city,
            coordinates: shipment.departure_location?.coordinates?.slice().reverse(),
            address: shipment.departure_address,
            postal_code: shipment.departure_postal,
          };
          arrival = {
            city: store?.exchangePoint?.city || null,
            coordinates: store?.exchangePoint?.coordinates.coordinates?.slice().reverse(),
            address: store?.exchangePoint?.address || null,
            postal_code: store?.exchangePoint?.postal_code || null,
          };
        } else {
          const prevStore = storesByStep.find((s) => s.step === delivery.shipment_step - 1);
          departure = {
            city: prevStore?.exchangePoint?.city || null,
            coordinates: prevStore?.exchangePoint?.coordinates.coordinates?.slice().reverse(),
            address: prevStore?.exchangePoint?.address || null,
            postal_code: prevStore?.exchangePoint?.postal_code || null,
          };
          arrival = {
            city: store?.exchangePoint?.city || null,
            coordinates: store?.exchangePoint?.coordinates.coordinates?.slice().reverse(),
            address: store?.exchangePoint?.address || null,
            postal_code: store?.exchangePoint?.postal_code || null,
          };
        }

        const client = courier?.user.clients?.[0];

        steps.push({
          id: delivery.shipment_step,
          title: `Step ${delivery.shipment_step}`,
          description: store?.exchangePoint?.description || 'Étape intermédiaire de livraison',
          date: delivery.send_date?.toISOString(),
          departure,
          arrival,
          courier: {
            name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            photoUrl: await this.minioService.generateImageUrl(
              'client-images',
              courier?.user.profile_picture || 'default-profile-picture.png',
            ),
          },
          end_time: store?.end_date?.toISOString(),
          idLink: delivery.delivery_id,
        });
      }

      const finalDelivery = deliveries.find((delivery) => delivery.shipment_step === 1000);
      if (finalDelivery) {
        const lastStore = storesByStep.find((s) => s.step === finalDelivery.shipment_step - 1);
        const client = finalDelivery.delivery_person?.user.clients?.[0];

        steps.push({
          id: 1000,
          title: 'Step finale',
          description: "Dernière étape de la livraison jusqu'au destinataire.",
          date: finalDelivery.send_date?.toISOString(),
          departure: {
            city: lastStore?.exchangePoint?.city || null,
            coordinates: lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse(),
            address: lastStore?.exchangePoint?.address || null,
            postal_code: lastStore?.exchangePoint?.postal_code || null,
          },
          arrival: {
            city: shipment.arrival_city,
            coordinates: shipment.arrival_location?.coordinates?.slice().reverse(),
            address: shipment.arrival_address,
            postal_code: shipment.arrival_postal,
          },
          courier: {
            name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            photoUrl: await this.minioService.generateImageUrl(
              'client-images',
              finalDelivery.delivery_person?.user.profile_picture || 'default-profile-picture.png',
            ),
          },
          end_time: shipment.deadline_date?.toISOString(),
          idLink: finalDelivery.delivery_id,
        });
      }
    }

    let realDepartureCity = shipment.departure_city;
    let realDepartureCoords = shipment.departure_location?.coordinates?.slice().reverse();
    let realDepartureAddress = shipment.departure_address;
    let realDeparturePostalCode = shipment.departure_postal;

    let realArrivalCity = shipment.arrival_city;
    let realArrivalCoords = shipment.arrival_location?.coordinates?.slice().reverse();
    let realArrivalAddress = shipment.arrival_address;
    let realArrivalPostalCode = shipment.arrival_postal;

    if (deliveries.length > 0) {
      const lastDelivery = deliveries[deliveries.length - 1];

      if (lastDelivery.shipment_step === 1000) {
        realDepartureCity = shipment.departure_city;
        realDepartureCoords = shipment.departure_location?.coordinates?.slice().reverse();
        realDepartureAddress = shipment.departure_address;
        realDeparturePostalCode = shipment.departure_postal;
      } else {
        const lastStore = storesByStep.find((s) => s.step === lastDelivery.shipment_step);
        realDepartureCity = lastStore?.exchangePoint?.city ?? shipment.departure_city;
        realDepartureCoords =
          lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() ??
          shipment.departure_location?.coordinates?.slice().reverse();
        realDepartureAddress = lastStore?.exchangePoint?.address ?? shipment.departure_address;
        realDeparturePostalCode =
          lastStore?.exchangePoint?.postal_code ?? shipment.departure_postal;
      }
    }

    const finished = deliveries.some((delivery) => delivery.shipment_step === 0);
    const showArrivalHandling =
      shipment.arrival_handling && !deliveries.some((delivery) => delivery.shipment_step === 1000);

    const showDepartureHandling =
      shipment.departure_handling && !deliveries.some((delivery) => delivery.shipment_step === 1);

    if (showArrivalHandling) {
      totalPrice = Number(totalPrice) + 29;
    }
    if (showDepartureHandling) {
      totalPrice = Number(totalPrice) + 29;
    }

    let departure_date: string;
    let arrival_date: string;

    const step0 = deliveries.find((delivery) => delivery.shipment_step === 0);
    const step1 = deliveries.find((delivery) => delivery.shipment_step === 1);
    const step1000 = deliveries.find((delivery) => delivery.shipment_step === 1000);

    if (step0) {
      departure_date = formatDate(step0.send_date);
      arrival_date = formatDate(step0.send_date);
    } else {
      departure_date = formatDate(shipment.deadline_date);
      arrival_date = formatDate(shipment.deadline_date);

      if (step1) {
        departure_date = formatDate(step1.send_date);
      }

      if (step1000) {
        arrival_date = formatDate(step1000.send_date);
      }
    }

    if (departure_date > arrival_date) {
      arrival_date = departure_date;
    }

    const result = {
      details: {
        id: shipment.shipment_id,
        name: shipment.description,
        departure: {
          city: realDepartureCity,
          coordinates: realDepartureCoords,
          address: realDepartureAddress,
          postal_code: realDeparturePostalCode,
        },
        arrival: {
          city: realArrivalCity,
          coordinates: realArrivalCoords,
          address: realArrivalAddress,
          postal_code: realArrivalPostalCode,
        },
        departure_date: departure_date,
        arrival_date: arrival_date,
        time_slot: shipment.time_slot,
        status: shipment.status ?? 'In Progress',
        initial_price: totalPrice,
        price_with_step: priceWithStep,
        invoice: parcels.map((p) => ({
          name: p.name,
          url_invoice: p.picture[0],
        })),
        urgent: shipment.urgent,
        finished: finished,
        trolleydrop: shipment.trolleydrop,
        departure_handling: showDepartureHandling,
        arrival_handling: showArrivalHandling,
        elevator_arrival: shipment.elevator_arrival,
        elevator_departure: shipment.elevator_departure,
        floor_arrival_handling: shipment.floor_arrival_handling,
        floor_departure_handling: shipment.floor_departure_handling,
      },
      package: parcels,
      steps: steps,
    };

    return result;
  }

  async getShipmentListItems(userId: string): Promise<ShipmentListItem[]> {
    const shipments = await this.shipmentRepository.find({
      where: { user: { user_id: userId }, status: Not('validated') },
      relations: ['parcels', 'deliveries'],
    });

    const shipmentListItems: ShipmentListItem[] = shipments
      .map((shipment) => {
        try {
          const packageCount = shipment.parcels.length;
          const progress = (shipment.deliveries.length / (shipment.deliveries.length + 1)) * 100;

          const formatDate = (date: Date | null): string | null => {
            if (!date) return null;
            return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
          };

          let departure_date: string | null;
          let arrival_date: string | null;

          const step0 = shipment.deliveries.find((delivery) => delivery.shipment_step === 0);
          const step1 = shipment.deliveries.find((delivery) => delivery.shipment_step === 1);
          const step1000 = shipment.deliveries.find((delivery) => delivery.shipment_step === 1000);

          if (step0) {
            departure_date = formatDate(step0.send_date);
            arrival_date = formatDate(step0.send_date);
          } else {
            departure_date = formatDate(shipment.deadline_date);
            arrival_date = formatDate(shipment.deadline_date);

            if (step1) {
              departure_date = formatDate(step1.send_date);
            }

            if (step1000) {
              arrival_date = formatDate(step1000.send_date);
            }
          }

          if (departure_date && arrival_date && departure_date > arrival_date) {
            arrival_date = departure_date;
          }

          return {
            id: shipment.shipment_id,
            name: shipment.description ?? 'Unnamed Shipment',
            status: progress > 0 ? 'In Progress' : 'pending',
            urgent: shipment.urgent,
            departure: {
              city: shipment.departure_city,
              address: shipment.departure_address,
              postalCode: shipment.departure_postal,
              coordinates: shipment.departure_location?.coordinates
                ? [
                    shipment.departure_location.coordinates[1],
                    shipment.departure_location.coordinates[0],
                  ]
                : [0, 0],
            },
            arrival: {
              city: shipment.arrival_city,
              address: shipment.arrival_address,
              postalCode: shipment.arrival_postal,
              coordinates: shipment.arrival_location?.coordinates
                ? [
                    shipment.arrival_location.coordinates[1],
                    shipment.arrival_location.coordinates[0],
                  ]
                : [0, 0],
            },
            arrival_date: arrival_date,
            theoretical_departure_date: departure_date,
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
      .filter((item) => item !== null) as ShipmentListItem[];

    return shipmentListItems;
  }

  async getMyShipmentsHistory(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ data: ShipmentHistoryRequest[]; totalRows: number }> {
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

    const shipmentRequests: ShipmentHistoryRequest[] = (await Promise.all(
      shipments.map(async (shipment) => {
        try {
          const parcels = await this.parcelRepository.find({
            where: { shipment: { shipment_id: shipment.shipment_id } },
          });
          const deliveries = await this.deliveryRepository.find({
            where: { shipment: { shipment_id: shipment.shipment_id } },
          });

          return {
            id: shipment.shipment_id,
            name: shipment.description ?? 'Unnamed Shipment',
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
      }),
    ).then((items) => items.filter((item) => item !== null))) as ShipmentHistoryRequest[];

    return {
      data: shipmentRequests,
      totalRows: total,
    };
  }

  async getShipmentDetails(shipment_id: string): Promise<DeliveryDetailsOffice> {
    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id: shipment_id },
      relations: [
        'parcels',
        'parcels.images',
        'deliveries',
        'deliveries.delivery_person',
        'deliveries.delivery_person.user',
        'deliveries.delivery_person.user.clients',
        'stores',
        'stores.exchangePoint',
      ],
    });

    if (!shipment) {
      throw new Error('Shipment not found');
    }

    const formatDate = (date: Date | null | undefined): string => {
      if (!date) return new Date().toISOString().split('T')[0];
      return `${date.getFullYear()}-${(date.getMonth() + 1)
        .toString()
        .padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    };

    const parcels = await Promise.all(
      shipment.parcels.map(async (parcel) => ({
        id: parcel.parcel_id,
        name: parcel.name,
        fragility: parcel.fragility ?? false,
        estimated_price: Number(parcel.estimate_price),
        weight: Number(parcel.weight),
        volume: Number(parcel.volume),
        picture: await Promise.all(
          parcel.images.map((img) =>
            this.minioService.generateImageUrl('client-images', img.image_url),
          ),
        ),
      })),
    );

    const deliveries = shipment.deliveries.sort((a, b) => a.shipment_step - b.shipment_step);
    const storesByStep = shipment.stores.sort((a, b) => a.step - b.step);

    const initialPrice = Number(shipment.proposed_delivery_price ?? shipment.estimated_total_price);
    const priceWithStep = deliveries.map((delivery) => ({
      step: `Step ${delivery.shipment_step}`,
      price: Number(delivery.delivery_price ?? delivery.amount),
    }));

    const steps: {
      id: number;
      title: string;
      description: string;
      date: string;
      departure: {
        city: string;
        coordinates: [number, number];
        address: string;
        postalCode: string;
      };
      arrival: {
        city: string;
        coordinates: [number, number];
        address: string;
        postalCode: string;
      };
      courier: {
        name: string;
        photoUrl: string;
      };
      idLink: string;
    }[] = [];

    if (deliveries.length === 0) {
      steps.push({
        id: -1,
        title: 'No Steps',
        description: "Aucune étape de livraison n'existe.",
        date: formatDate(new Date()),
        departure: {
          city: shipment.departure_city || '',
          coordinates: shipment.departure_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ],
          address: shipment.departure_address || '',
          postalCode: shipment.departure_postal || '',
        },
        arrival: {
          city: shipment.arrival_city || '',
          coordinates: shipment.arrival_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ],
          address: shipment.arrival_address || '',
          postalCode: shipment.arrival_postal || '',
        },
        courier: {
          name: 'Unknown',
          photoUrl: '',
        },
        idLink: '-1',
      });
    } else {
      for (const delivery of deliveries) {
        const store = storesByStep.find((s) => s.step === delivery.shipment_step);
        const courier = delivery.delivery_person;

        let departure, arrival;

        if (delivery.shipment_step === 1) {
          departure = {
            city: shipment.departure_city,
            coordinates: shipment.departure_location?.coordinates?.slice().reverse() as [
              number,
              number,
            ],
            address: shipment.departure_address,
            postalCode: shipment.departure_postal,
          };
          arrival = {
            city: store?.exchangePoint?.city ?? '',
            coordinates: store?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [
              number,
              number,
            ],
            address: store?.exchangePoint?.address ?? '',
            postalCode: store?.exchangePoint?.postal_code ?? '',
          };
        } else {
          const prevStore = storesByStep.find((s) => s.step === delivery.shipment_step - 1);
          departure = {
            city: prevStore?.exchangePoint?.city ?? '',
            coordinates: prevStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [
              number,
              number,
            ],
            address: prevStore?.exchangePoint?.address ?? '',
            postalCode: prevStore?.exchangePoint?.postal_code ?? '',
          };
          arrival = {
            city: store?.exchangePoint?.city ?? '',
            coordinates: store?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [
              number,
              number,
            ],
            address: store?.exchangePoint?.address ?? '',
            postalCode: store?.exchangePoint?.postal_code ?? '',
          };
        }

        const client = courier?.user.clients?.[0];

        const stepDate = formatDate(delivery.send_date);

        steps.push({
          id: delivery.shipment_step,
          title: `Step ${delivery.shipment_step}`,
          description: store?.exchangePoint?.description || 'Étape intermédiaire de livraison',
          date: stepDate,
          departure,
          arrival,
          courier: {
            name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            photoUrl: await this.minioService.generateImageUrl(
              'client-images',
              courier?.user.profile_picture,
            ),
          },
          idLink: delivery.delivery_id,
        });
      }

      const finalDelivery = deliveries.find((delivery) => delivery.shipment_step === 1000);
      if (finalDelivery) {
        const lastStore = storesByStep.find((s) => s.step === finalDelivery.shipment_step - 1);
        const client = finalDelivery.delivery_person?.user.clients?.[0];

        steps.push({
          id: 1000,
          title: 'Step finale',
          description: "Dernière étape de la livraison jusqu'au destinataire.",
          date: formatDate(shipment.deadline_date),
          departure: {
            city: lastStore?.exchangePoint?.city ?? '',
            coordinates: lastStore?.exchangePoint?.coordinates.coordinates?.slice().reverse() as [
              number,
              number,
            ],
            address: lastStore?.exchangePoint?.address ?? '',
            postalCode: lastStore?.exchangePoint?.postal_code ?? '',
          },
          arrival: {
            city: shipment.arrival_city || '',
            coordinates: shipment.arrival_location?.coordinates?.slice().reverse() as [
              number,
              number,
            ],
            address: shipment.arrival_address || '',
            postalCode: shipment.arrival_postal || '',
          },
          courier: {
            name: client ? `${client.first_name} ${client.last_name}` : 'Unknown',
            photoUrl: await this.minioService.generateImageUrl(
              'client-images',
              finalDelivery.delivery_person?.user.profile_picture,
            ),
          },
          idLink: finalDelivery.delivery_id,
        });
      }
    }

    const finished = deliveries.some((delivery) => delivery.shipment_step === 0);
    const showArrivalHandling =
      shipment.arrival_handling && !deliveries.some((delivery) => delivery.shipment_step === 1);
    const showDepartureHandling =
      shipment.departure_handling &&
      !deliveries.some((delivery) => delivery.shipment_step === 1000);

    let totalPrice = initialPrice;
    if (showArrivalHandling) totalPrice += 29;
    if (showDepartureHandling) totalPrice += 29;

    let departure_date: string;
    let arrival_date: string;

    const step0 = deliveries.find((delivery) => delivery.shipment_step === 0);
    const step1 = deliveries.find((delivery) => delivery.shipment_step === 1);
    const step1000 = deliveries.find((delivery) => delivery.shipment_step === 1000);

    if (step0) {
      departure_date = formatDate(step0.send_date);
      arrival_date = formatDate(step0.send_date);
    } else {
      departure_date = formatDate(shipment.deadline_date);
      arrival_date = formatDate(shipment.deadline_date);

      if (step1) {
        departure_date = formatDate(step1.send_date);
      }

      if (step1000) {
        arrival_date = formatDate(step1000.send_date);
      }
    }

    if (departure_date > arrival_date) {
      arrival_date = departure_date;
    }

    const result: DeliveryDetailsOffice = {
      details: {
        id: shipment.shipment_id,
        name: shipment.description || '',
        description: shipment.description || '',
        departure: {
          city: shipment.departure_city || '',
          coordinates: shipment.departure_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ],
          address: shipment.departure_address || '',
          postalCode: shipment.departure_postal || '',
        },
        arrival: {
          city: shipment.arrival_city || '',
          coordinates: shipment.arrival_location?.coordinates?.slice().reverse() as [
            number,
            number,
          ],
          address: shipment.arrival_address || '',
          postalCode: shipment.arrival_postal || '',
        },
        departure_date: departure_date,
        arrival_date: arrival_date,
        status: shipment.status ?? 'In Progress',
        initial_price: totalPrice,
        price_with_step: priceWithStep,
        invoice: parcels.map((p) => ({
          name: p.name,
          url_invoice: p.picture[0],
        })),
        urgent: shipment.urgent,
        finished,
        trolleydrop: shipment.trolleydrop || false,
        complementary_info: '',
        facture_url: '',
        departure_handling: showDepartureHandling,
        arrival_handling: showArrivalHandling,
        elevator_arrival: shipment.elevator_arrival,
        elevator_departure: shipment.elevator_departure,
        floor_arrival_handling: shipment.floor_arrival_handling,
        floor_departure_handling: shipment.floor_departure_handling,
      },
      package: parcels,
      steps,
    };

    return result;
  }
}
