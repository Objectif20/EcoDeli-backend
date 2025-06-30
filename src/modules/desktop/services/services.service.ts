import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicesList } from 'src/common/entities/services_list.entity';
import { MyServicesResponse, ServiceDetails } from './type';
import { MinioService } from 'src/common/services/file/minio.service';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServicesList)
    private readonly servicesListRepository: Repository<ServicesList>,

    private readonly minioService: MinioService,

  ) {}

  async getAllServices(page = 1, limit = 10): Promise<MyServicesResponse> {
    const offset = (page - 1) * limit;

    const [services, total] = await this.servicesListRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { name: 'ASC' },
    });

    const data = services.map(service => ({
      id: service.service_id,
      name: service.name,
      description: service.description,
      type: service.service_type,
      city: service.city,
      price: Number(service.price),
      duration: service.duration_minute,
      available: service.available,
      status: service.status,
      validated: service.validated,
    }));

    return {
      data,
      total,
      page,
      limit,
    };
  }
  async getServiceDetails(service_id: string) : Promise<ServiceDetails> {
    const serviceList = await this.servicesListRepository.findOne({
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

    const commentsNested = await Promise.all(providerAppointments.map(async (appointment) => {
      if (appointment.review_presta) {
        const clientPhotoUrl = appointment.client.user
          ? await this.minioService.generateImageUrl('client-images', appointment.client.user.profile_picture)
          : null;

        const responseAuthorPhotoUrl = firstService && firstService.provider && firstService.provider.user
          ? await this.minioService.generateImageUrl('client-images', firstService.provider.user.profile_picture)
          : null;

        return {
          id: appointment.review_presta.review_presta_id,
          author: {
            id: appointment.client.client_id,
            name: `${appointment.client.first_name} ${appointment.client.last_name}`,
            photo: clientPhotoUrl,
          },
          content: appointment.review_presta.comment ?? '',
          response: appointment.review_presta.responses?.length ? {
            id: appointment.review_presta.responses[0].review_presta_response_id,
            author: {
              id: firstService.provider.provider_id,
              name: `${firstService.provider.first_name} ${firstService.provider.last_name}`,
              photo: responseAuthorPhotoUrl,
            },
            content: appointment.review_presta.responses[0].comment,
          } : undefined,
        };
      }
      return null;
    }));
    const comments = commentsNested.filter((c): c is NonNullable<typeof c> => c !== null);

    const rate = providerAppointments.reduce((acc, appointment) => acc + (appointment.review_presta?.rating || 0), 0)
      / (providerAppointments.filter(appointment => appointment.review_presta).length || 1);

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
      rate,
      comments,
    };
  }
}


