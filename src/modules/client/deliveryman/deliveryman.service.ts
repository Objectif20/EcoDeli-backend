

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
import { Shipment } from 'src/common/entities/shipment.entity';

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

  export class VehicleResponseDto {
    id: string;
    name: string;
    matricule: string;
    co2: number;
    allow: boolean;
    image: string;
    justification_file: string;
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
    @InjectRepository(Shipment)
    private readonly shipmentRepository: Repository<Shipment>,
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

  async getMyVehicles(userId: string, page: number = 1, limit: number = 10): Promise<{ data: VehicleResponseDto[], totalRows: number }> {
    const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { user: { user_id: userId } } });
    if (!deliveryPerson) {
      throw new Error('Livreur non trouvé');
    }
  
    const [vehicles, totalRows] = await this.vehicleRepository.findAndCount({
      where: { deliveryPerson },
      skip: (page - 1) * limit,  
      take: limit,   
      relations: {
        vehicleDocuments: true,
      },          
    });
  
    const data = await Promise.all(vehicles.map(async (vehicle) => ({
      id: vehicle.vehicle_id,
      name: vehicle.model,
      matricule: vehicle.registration_number,
      co2: vehicle.co2_consumption || 0,
      allow: vehicle.validated,
      image: vehicle.image_url ? await this.minioService.generateImageUrl("client-documents", vehicle.image_url) : "",
      justification_file: vehicle.vehicleDocuments && vehicle.vehicleDocuments[0] ? await this.minioService.generateImageUrl("client-documents", vehicle.vehicleDocuments[0].vehicle_document_url) : "",
    })));
    return { data, totalRows };
  }

  async isUserAdmissibleForDelivery(userId: string): Promise<boolean> {

    const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { user: { user_id: userId } } });
    if (!deliveryPerson) {
      return false;
    }

    if (!deliveryPerson.validated) {
      return false;
    }    

    return true;
  }

  async isDeliveryPersonIsAdmissibleForThisDelivery(user_id: string, shipmentId: string): Promise<boolean> {
    if (!user_id || !shipmentId) {
      console.log("user_id or shipmentId is missing");
      return false;
    }

    const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { user: { user_id } } });
    if (!deliveryPerson) {
      console.log("Delivery person not found");
      return false;
    }

    const shipment = await this.shipmentRepository.findOne({
      where: { shipment_id: shipmentId },
      relations: ['deliveries', 'stores', 'stores.exchangePoint', 'user'],
    });
    if (!shipment) {
      console.log("Shipment not found");
      return false;
    }

    if (user_id === shipment.user.user_id) {
      console.log("User is the same as the shipment user");
      return false;
    }

    if (!deliveryPerson.validated) {
      console.log("Delivery person is not validated");
      return false;
    }
    /*
    const shipmentWeight = shipment.weight || 0;
    const shipmentVolume = shipment.volume || 0;

    const vehicles = await this.vehicleRepository.find({ where: { deliveryPerson } });

    if (!vehicles || vehicles.length === 0) {
      console.log("No vehicle found for the delivery person");
      return false;
    }

    let isAdmissibleVehicle = false;

    for (const vehicle of vehicles) {
      if (!vehicle.validated) continue;

      const vehicleCategory = vehicle.category;
      if (!vehicleCategory) {
        console.log("Vehicle category not found for vehicle", vehicle.vehicle_id);
        continue;
      }

      const category = await this.categoryRepository.findOne({ where: { category_id: vehicleCategory.category_id } });
      if (!category) {
        console.log("Category not found for vehicle", vehicle.vehicle_id);
        continue;
      }

      // Vérification avec marge de sécurité de 25 %
      const maxAllowedWeight = category.max_weight * 0.75;
      const maxAllowedVolume = Number(category.max_dimension) * 0.75;

      if (maxAllowedWeight >= shipmentWeight && maxAllowedVolume >= shipmentVolume) {
        isAdmissibleVehicle = true;
        break;
      }
    }

    if (!isAdmissibleVehicle) {
      console.log("No admissible vehicle found with margin");
      return false;
    }*/

    return true;
  }


}
