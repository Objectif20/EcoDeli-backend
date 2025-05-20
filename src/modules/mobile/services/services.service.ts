import { InjectRepository } from "@nestjs/typeorm";
import { Appointments } from "src/common/entities/appointments.entity";
import { Client } from "src/common/entities/client.entity";
import { MinioService } from "src/common/services/file/minio.service";
import { Repository } from "typeorm";
import { ServiceDetails, serviceHistory } from "./types";
import { NotFoundException } from "@nestjs/common";
import { ServicesList } from "src/common/entities/services_list.entity";

export class ServicesService {

    constructor(
        @InjectRepository(Client)
        private readonly clientRepo: Repository<Client>,
        @InjectRepository(Appointments)
        private readonly appointmentRepo: Repository<Appointments>,
        @InjectRepository(ServicesList)
        private readonly serviceRepo: Repository<ServicesList>,
        private readonly minioService: MinioService,
    ) {}

    async getMyService(userId: string, page = 1, limit = 10): Promise<{
        data: serviceHistory[],
        totalRows: number,
        totalPages: number,
        currentPage: number,
        limit: number,
    }> {
        const client = await this.clientRepo.findOne({
        where: { user: { user_id: userId } },
        relations: ['user'],
        });
    
        if (!client) {
        throw new Error('Client not found');
        }
    
        const appointments = await this.appointmentRepo.find({
        where: { client: { client_id: client.client_id } },
        relations: ['provider', 'provider.user', 'service', 'review_presta'],
        order: { service_date: 'DESC' },
        });
    
        const servicesHistory = await Promise.all(
        appointments.map(async (appointment) => {
            const provider = appointment.provider;
            const providerUser = provider.user;
            const service = appointment.service;
            const review = appointment.review_presta;
    
            return {
                id : appointment.appointment_id,
                id_service: appointment.service.service_id,
                price: Number(appointment.amount),
                provider: {
                    id: provider.provider_id,
                    name: `${provider.first_name} ${provider.last_name}`,
                    photo: providerUser.profile_picture
                    ? await this.minioService.generateImageUrl('client-images', providerUser.profile_picture)
                    : null,
                },
                date: appointment.service_date.toISOString(),
                service_name: service.name,
                rate: review ? review.rating : null,
                review: review ? review.comment : null,
                finished: appointment.status === 'completed',
            };
        })
        );
  
        const totalRows = servicesHistory.length;
        const totalPages = Math.ceil(totalRows / limit);
        const startIndex = (page - 1) * limit;
        const paginatedHistory = servicesHistory.slice(startIndex, startIndex + limit);
    
        return {
        data: paginatedHistory,
        totalRows,
        totalPages,
        currentPage: page,
        limit,
        };
    }

      async getServiceDetails(service_id: string) : Promise<ServiceDetails> {
        const serviceList = await this.serviceRepo.findOne({
          where: { service_id },
          relations: [
            'services',
            'services.provider',
            'services.provider.user',
            'images',
            'keywords',
            'keywords.keywordList',
            'appointments',
            'appointments.review_presta',
            'appointments.review_presta.responses',
            'appointments.client',
            'appointments.client.user',
          ],
        });
    
        if (!serviceList) {
          throw new NotFoundException('Service introuvable');
        }
    
        const providerAppointments = serviceList.appointments;
        const firstService = serviceList.services[0];
    
        const imageUrls = await Promise.all(serviceList.images.map(image =>
          this.minioService.generateImageUrl('provider-images', image.image_service_url)
        ));
    
        const authorPhotoUrl = firstService && firstService.provider && firstService.provider.user
          ? await this.minioService.generateImageUrl('client-images', firstService.provider.user.profile_picture)
          : null;
    
        return {
          service_id: serviceList.service_id,
          service_type: serviceList.service_type,
          status: serviceList.status,
          name: serviceList.name,
          city: serviceList.city,
          price: serviceList.price,
          price_admin: serviceList.price_admin,
          duration_time: serviceList.duration_minute,
          available: serviceList.available,
          keywords: serviceList.keywords.map(keyword => keyword.keywordList.keyword),
          images: imageUrls,
          description: serviceList.description,
          author: firstService && firstService.provider && firstService.provider.user ? {
            id: firstService.provider.provider_id,
            name: `${firstService.provider.first_name} ${firstService.provider.last_name}`,
            email: firstService.provider.user.email,
            photo: authorPhotoUrl,
          } : null,
        };
      }


}