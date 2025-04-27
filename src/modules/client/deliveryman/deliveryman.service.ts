

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { Trip } from 'src/common/entities/trips.entity';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Category } from 'src/common/entities/category.entity';
import { MinioService } from 'src/common/services/file/minio.service';
import { Vehicle } from 'src/common/entities/vehicle.entity';
import { VehicleDocument } from 'src/common/entities/vehicle_documents.entity';

export interface RoutePostDto {
    from: string;
    to: string;
    permanent: boolean;
    date?: string;
    weekday?: string;
    tolerate_radius: number;
    comeback_today_or_tomorrow: "today" | "tomorrow" | "later";
  }

  export interface Route {
    id: string;
    from: string;
    to: string;
    permanent: boolean;
    coordinates: {
      origin: [number, number];
      destination: [number, number];
    };
    date?: string;
    weekday?: string;
    tolerate_radius: number;
    comeback_today_or_tomorrow: "today" | "tomorrow" | "later";
  }

@Injectable()
export class DeliveryManService {
  constructor(
    @InjectRepository(Trip)
    private tripRepository: Repository<Trip>,
    @InjectRepository(DeliveryPerson)
    private deliveryPersonRepository: Repository<DeliveryPerson>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(VehicleDocument)
    private vehicleDocumentRepository: Repository<VehicleDocument>,
    private readonly minioService: MinioService,
  ) {}

  private async getCoordinates(city: string): Promise<{ lat: number; lng: number }> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: city,
          format: 'json',
          addressdetails: 1,
          limit: 1,
        },
        headers: {
          'User-Agent': 'EcoDeli/1.0 (contact.ecodeli@gmail.com)',
        },
      });

      if (response.data.length === 0) {
        throw new Error('Ville non trouvée');
      }

      const { lat, lon } = response.data[0];
      return { lat: parseFloat(lat), lng: parseFloat(lon) };
    } catch (error) {
      throw new Error(`Erreur lors de la récupération des coordonnées : ${error.message}`);
    }
  }

  async createTrip(userId: string, routeData: RoutePostDto): Promise<Trip> {
    const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { user: { user_id: userId } } });
    if (!deliveryPerson) {
      throw new Error('Livreur non trouvé');
    }
  
    const departureCoordinates = await this.getCoordinates(routeData.from);
    const arrivalCoordinates = await this.getCoordinates(routeData.to);
  
    const newTrip = this.tripRepository.create();
  
    newTrip.departure_location = {
      type: 'Point',
      coordinates: [departureCoordinates.lng, departureCoordinates.lat],
    };
  
    newTrip.arrival_location = {
      type: 'Point',
      coordinates: [arrivalCoordinates.lng, arrivalCoordinates.lat],
    };
  
    newTrip.departure_city = routeData.from;
    newTrip.arrival_city = routeData.to;
    newTrip.date = routeData.date ? new Date(routeData.date) : null;
    newTrip.weekday = routeData.weekday ?? null;
    newTrip.tolerated_radius = routeData.tolerate_radius;
    newTrip.comeback_today_or_tomorrow = routeData.comeback_today_or_tomorrow;
    newTrip.delivery_person = deliveryPerson;
  
    return this.tripRepository.save(newTrip);
  }

  async getTripsByDeliveryPerson(userId: string): Promise<Route[]> {
    const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { user: { user_id: userId } } });
    if (!deliveryPerson) {
      throw new Error('Livreur non trouvé');
    }

    const trips = await this.tripRepository.find({ where: { delivery_person: deliveryPerson } });

    return trips.map((trip) => ({
      id: trip.trip_id,
      from: trip.departure_city,
      to: trip.arrival_city,
      permanent: trip.weekday !== null,
      coordinates: {
        origin: [trip.departure_location.coordinates[1], trip.departure_location.coordinates[0]],
        destination: [trip.arrival_location.coordinates[1], trip.arrival_location.coordinates[0]],
      },
      date: trip.date ? trip.date.toISOString().split('T')[0] : undefined,
      weekday: trip.weekday ?? undefined,
      tolerate_radius: trip.tolerated_radius,
      comeback_today_or_tomorrow: trip.comeback_today_or_tomorrow as "today" | "tomorrow" | "later", // <--- ici, cast propre
    }));
  }

  async getVehicleCategories(): Promise<Category[]> {
    return this.categoryRepository.find();
  }

  async addVehicle(userId: string, vehicleData: {
      model: string,
      registrationNumber: string,
      electric: boolean,
      co2Consumption: number,
      categoryId: number,
      image: Express.Multer.File,
      document: Express.Multer.File
  }): Promise<Vehicle> {
      const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { user: { user_id: userId } } });
      if (!deliveryPerson) {
          throw new Error('Livreur non trouvé');
      }

      const category = await this.categoryRepository.findOne({ where: { category_id: vehicleData.categoryId } });
      if (!category) {
          throw new Error('Catégorie non trouvée');
      }

      const imageFileName = `${userId}/deliveryman/vehicle/${vehicleData.model}_${vehicleData.registrationNumber}_${Date.now()}.${vehicleData.image.originalname.split('.').pop()}`;
      await this.minioService.uploadFileToBucket('client-documents', imageFileName, vehicleData.image);

      const newVehicle = this.vehicleRepository.create();
      newVehicle.model = vehicleData.model;
      newVehicle.registration_number = vehicleData.registrationNumber;
      newVehicle.electric = vehicleData.electric;
      newVehicle.co2_consumption = vehicleData.co2Consumption;
      newVehicle.category = category;
      newVehicle.deliveryPerson = deliveryPerson;
      newVehicle.image_url = imageFileName;

      const savedVehicle = await this.vehicleRepository.save(newVehicle);

      const documentFileName = `${userId}/deliveryman/vehicle/documents/${savedVehicle.vehicle_id}/${vehicleData.document.originalname}`;
      const documentUrl = await this.minioService.uploadFileToBucket('client-documents', documentFileName, vehicleData.document);

      const newDocument = this.vehicleDocumentRepository.create();
      newDocument.name = vehicleData.document.originalname;
      newDocument.vehicle_document_url = documentFileName;
      newDocument.vehicle = savedVehicle;

      await this.vehicleDocumentRepository.save(newDocument);

      return savedVehicle;
  }
}
