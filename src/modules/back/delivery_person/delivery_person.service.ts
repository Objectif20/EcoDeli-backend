import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';

import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Vehicle } from 'src/common/entities/vehicle.entity';
import { Admin } from 'src/common/entities/admin.entity';
import { DeliveryPersonResponse } from './dto/delivery_person.dto';
import { VehicleResponse } from './dto/vehicle.dto';

@Injectable()
export class DeliveryPersonService {
    constructor(
        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,

        @InjectRepository(Vehicle)
        private readonly vehicleRepository: Repository<Vehicle>,

        @InjectRepository(Admin)
        private readonly adminRepository: Repository<Admin>,
    ) { }

    async updateDeliveryPersonStatus(id: string, status: 'Accepted' | 'Rejected'): Promise<DeliveryPerson | null> {
        const result = await this.deliveryPersonRepository.update(
            { delivery_person_id: id, status: 'On Going' },
            { status }
        );

        if (result.affected === 0) {
            throw new NotFoundException('Delivery person not found or not in On Going status');
        }

        return this.deliveryPersonRepository.findOne({
            where: { delivery_person_id: id },
            select: ['delivery_person_id', 'status', 'photo', 'professional_email'],
        });
    }


    async validateVehicleOfDeliveryPerson(deliveryPersonId: string, vehicleId: string, validated: boolean, adminId: string): Promise<Vehicle | null> {
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

        await this.vehicleRepository.update(vehicleId, { validated, validatedByAdmin: admin });

        return this.vehicleRepository.findOne({
            where: { vehicle_id: vehicleId },
            relations: ['validatedByAdmin'],
            select: ['vehicle_id', 'validated', 'model', 'registration_number', 'validatedByAdmin'],
        });
    }


    async getAllDeliveryPersons(
        status?: string,
        page: number = 1,
        limit: number = 10
    ): Promise<{ data: DeliveryPersonResponse[], meta: { total: number, page: number, limit: number }, totalRows: number }> {
        const skip = (page - 1) * limit;
    
        const queryBuilder = this.deliveryPersonRepository.createQueryBuilder('deliveryPerson')
            .leftJoinAndSelect('deliveryPerson.user', 'user')
            .leftJoinAndSelect('deliveryPerson.vehicles', 'vehicle')
            .leftJoinAndSelect('deliveryPerson.DeliveryPersonDocuments', 'deliveryPersonDocuments')
            .leftJoinAndSelect('vehicle.vehicleDocuments', 'vehicleDocuments');
    
        if (status) {
            queryBuilder.where('deliveryPerson.status = :status', { status });
        }
    
        const [deliveryPersons, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .getManyAndCount();
    
        const result: DeliveryPersonResponse[] = deliveryPersons.map(deliveryPerson => ({
            id: deliveryPerson.delivery_person_id,
            email: deliveryPerson.professional_email,
            status: deliveryPerson.status,
            phone_number: deliveryPerson.phone_number,
            vehicle_type: deliveryPerson.vehicle_type,
            validated: deliveryPerson.validated,
            city: deliveryPerson.city,
            country: deliveryPerson.country,
            balance: deliveryPerson.balance,
            vehicles: deliveryPerson.vehicles.map(vehicle => ({
                vehicle_id: vehicle.vehicle_id,
                model: vehicle.model,
                registration_number: vehicle.registration_number,
                type: vehicle.electric ? 'Electric' : 'Non-Electric',
                number: deliveryPerson.vehicle_number || 'N/A',
                documents: vehicle.vehicleDocuments.map(doc => ({
                    id: doc.vehicle_document_id,
                    url: doc.vehicle_document_url,
                })),
            })),
            documents: deliveryPerson.DeliveryPersonDocuments.map(doc => ({
                id: doc.document_id,
                url: doc.document_url,
            })),
        }));
    
        return {
            data: result,
            meta: {
                total,
                page,
                limit,
            },
            totalRows: total,
        };
    }




    async getDeliveryPersonById(id: string): Promise<DeliveryPersonResponse> {
        const deliveryPerson = await this.deliveryPersonRepository.findOne({
            where: { delivery_person_id: id },
            relations: ['vehicles', 'vehicles.vehicleDocuments', 'DeliveryPersonDocuments'],
            select: [
                'delivery_person_id',
                'professional_email',
                'phone_number',
                'status',
                'license',
                'vehicle_type',
                'vehicle_number',
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

        if (!deliveryPerson) {
            throw new NotFoundException('Delivery person not found');
        }

        const vehicles: VehicleResponse[] = deliveryPerson.vehicles.map(vehicle => ({
            vehicle_id: vehicle.vehicle_id,
            model: vehicle.model,
            registration_number: vehicle.registration_number,
            type: vehicle.electric ? 'Electric' : 'Non-Electric',
            number: deliveryPerson.vehicle_number || 'N/A',
            documents: vehicle.vehicleDocuments.map(doc => ({
                id: doc.vehicle_document_id,
                url: doc.vehicle_document_url,
            })),
        }));

        const documents = deliveryPerson.DeliveryPersonDocuments.map(doc => ({
            id: doc.document_id,
            url: doc.document_url,
        }));

        return {
            id: deliveryPerson.delivery_person_id,
            email: deliveryPerson.professional_email,
            status: deliveryPerson.status,
            phone_number: deliveryPerson.phone_number,
            vehicle_type: deliveryPerson.vehicle_type,
            validated: deliveryPerson.validated,
            city: deliveryPerson.city,
            country: deliveryPerson.country,
            balance: deliveryPerson.balance,
            vehicles: vehicles,
            documents: documents,
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
                'vehicle_type',
                'vehicle_number',
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