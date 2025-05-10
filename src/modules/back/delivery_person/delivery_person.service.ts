import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository} from 'typeorm';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Vehicle } from 'src/common/entities/vehicle.entity';
import { Admin } from 'src/common/entities/admin.entity';
import { AllDeliveryPerson, DeliverymanDetails, Route } from './type';
import { MinioService } from 'src/common/services/file/minio.service';
import { Trip } from 'src/common/entities/trips.entity';

@Injectable()
export class DeliveryPersonService {
    constructor(
        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,

        @InjectRepository(Vehicle)
        private readonly vehicleRepository: Repository<Vehicle>,

        @InjectRepository(Admin)
        private readonly adminRepository: Repository<Admin>,

        @InjectRepository(Trip)
        private readonly tripRepository: Repository<Trip>,

        private readonly minioService: MinioService,
    ) { }

    async updateDeliveryPersonStatus(id: string): Promise<DeliveryPerson | null> {
        const result = await this.deliveryPersonRepository.update(
            { delivery_person_id: id },
            { validated: true },
        );

        if (result.affected === 0) {
            throw new NotFoundException('Delivery person not found or not in On Going status');
        }

        return this.deliveryPersonRepository.findOne({
            where: { delivery_person_id: id },
            select: ['delivery_person_id', 'status', 'photo', 'professional_email'],
        });
    }

    async validateVehicleOfDeliveryPerson(deliveryPersonId: string, vehicleId: string, adminId: string): Promise<Vehicle | null> {
        const vehicle = await this.vehicleRepository.findOne({
            where: { vehicle_id: vehicleId, deliveryPerson: { delivery_person_id: deliveryPersonId } },
            relations: ['deliveryPerson'],
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found or does not belong to the specified delivery person.');
        }

        const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { delivery_person_id: deliveryPersonId } });

        if (!deliveryPerson) {
            throw new NotFoundException('Delivery person not found.');
        }

        if (!deliveryPerson.validated) {
            throw new NotFoundException('Delivery person not validated, impossible to validate vehicle');
        }

        const admin = await this.adminRepository.findOne({ where: { admin_id: adminId } });

        if (!admin) {
            throw new NotFoundException('Admin not found');
        }

        await this.vehicleRepository.update(vehicleId, { validated: true, validatedByAdmin: admin });

        return this.vehicleRepository.findOne({
            where: { vehicle_id: vehicleId },
            relations: ['validatedByAdmin'],
            select: ['vehicle_id', 'validated', 'model', 'registration_number', 'validatedByAdmin'],
        });
    }

    async getAllDeliveryPersons(
        page: number = 1,
        limit: number = 10
    ): Promise<{ data: AllDeliveryPerson[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
        
        const skip = (page - 1) * limit;

        const [deliveryPersons, total] = await this.deliveryPersonRepository.findAndCount({
            skip,
            take: limit,
            relations: ['vehicles', 'user', 'user.clients'],
        });

        const formattedDeliveryPersons = deliveryPersons.map(deliveryPerson => ({
            id: deliveryPerson.delivery_person_id,
            profile_picture: deliveryPerson.user?.profile_picture,
            first_name: deliveryPerson.user.clients[0]?.first_name,
            last_name: deliveryPerson.user.clients[0]?.last_name,
            status: deliveryPerson.validated,
            email: deliveryPerson.professional_email,
            rate: 0,
        }));

        return {
            data: formattedDeliveryPersons,
            meta: {
                total,
                page,
                limit,
            },
            totalRows: total,
        };
    }

    async getDeliveryPersonById(id: string): Promise<DeliverymanDetails> {
        const deliveryPerson = await this.deliveryPersonRepository.findOne({
            where: { delivery_person_id: id },
            relations: ['vehicles', 'vehicles.vehicleDocuments', 'DeliveryPersonDocuments', 'user', 'user.clients', 'trips'],
        });
    
        if (!deliveryPerson) {
            throw new NotFoundException('Delivery person not found');
        }
        console.log("Delivery Person Details:");
        console.log(deliveryPerson);
    
        const vehicles = await Promise.all(deliveryPerson.vehicles.map(async vehicle => ({
            id: vehicle.vehicle_id,
            name: vehicle.model,
            matricule: vehicle.registration_number,
            co2: vehicle.co2_consumption || 0,
            allow: vehicle.validated,
            image: vehicle.image_url ? await this.minioService.generateImageUrl("client-documents", vehicle.image_url) : "",
            justification_file: vehicle.vehicleDocuments && vehicle.vehicleDocuments[0] ? await this.minioService.generateImageUrl("client-documents", vehicle.vehicleDocuments[0].vehicle_document_url) : "",
        })));
    
            
        return {
            info: {
                profile_picture: deliveryPerson.user?.profile_picture,
                first_name: deliveryPerson.user.clients[0]?.first_name,
                last_name: deliveryPerson.user.clients[0]?.last_name,
                validated: deliveryPerson.validated,
                description: deliveryPerson.description || '',
                email: deliveryPerson.professional_email,
                phone: deliveryPerson.phone_number,
                document: deliveryPerson.DeliveryPersonDocuments?.[0]?.document_url,
            },
            vehicles: vehicles,
 
        };
    }

    async updateDeliveryPerson(id: string, updateData: Partial<DeliveryPerson>): Promise<DeliveryPerson> {
        const deliveryPerson = await this.deliveryPersonRepository.findOne({ where: { delivery_person_id: id } });

        if (!deliveryPerson) {
            throw new NotFoundException('Delivery person not found');
        }

        await this.deliveryPersonRepository.update(id, updateData);

        const updatedDeliveryPerson = await this.deliveryPersonRepository.findOne({
            where: { delivery_person_id: id },
            select: [
                'delivery_person_id',
                'professional_email',
                'phone_number',
                'status',
                'license',
                'country',
                'city',
                'address',
                'photo',
                'balance',
                'nfc_code',
                'stripe_transfer_id',
                'description',
                'postal_code',
                'validated',
            ],
        });

        if (!updatedDeliveryPerson) {
            throw new NotFoundException('Error retrieving updated delivery person');
        }

        return updatedDeliveryPerson;
    }

    async updateVehicleOfDeliveryPerson(deliveryPersonId: string, vehicleId: string, updateData: Partial<Vehicle>): Promise<Vehicle> {
        const vehicle = await this.vehicleRepository.findOne({
            where: { vehicle_id: vehicleId, deliveryPerson: { delivery_person_id: deliveryPersonId } },
            relations: ['deliveryPerson'],
        });

        if (!vehicle) {
            throw new NotFoundException('Vehicle not found or does not belong to the specified delivery person.');
        }

        await this.vehicleRepository.update(vehicleId, updateData);

        const updatedVehicle = await this.vehicleRepository.findOne({
            where: { vehicle_id: vehicleId },
            select: [
                'vehicle_id',
                'model',
                'registration_number',
                'validated',
            ],
        });

        if (!updatedVehicle) {
            throw new NotFoundException('Error retrieving updated vehicle');
        }

        return updatedVehicle;
    }


}