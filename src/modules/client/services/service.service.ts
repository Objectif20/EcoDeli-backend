import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';

import { ServicesList } from 'src/common/entities/services_list.entity';
import { ServiceImage } from 'src/common/entities/services_image.entity';
import { Providers } from 'src/common/entities/provider.entity';
import { Services } from 'src/common/entities/service.entity';
import { FavoriteService } from 'src/common/entities/favorite_services.entity';
import { Appointments } from 'src/common/entities/appointments.entity';
import { ProviderKeywords } from 'src/common/entities/provider_keyword.entity';
import { PrestaReview } from 'src/common/entities/presta_reviews.entity';
import { PrestaReviewResponse } from 'src/common/entities/presta_review_responses.entity';
import { Client } from 'src/common/entities/client.entity';
import { MinioService } from 'src/common/services/file/minio.service';
import { ProviderKeywordsList } from 'src/common/entities/provider_keywords_list.entity';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServicesList) private serviceRepo: Repository<ServicesList>,
    @InjectRepository(ServiceImage) private imageRepo: Repository<ServiceImage>,
    @InjectRepository(Providers) private providerRepo: Repository<Providers>,
    @InjectRepository(Services) private linkRepo: Repository<Services>,
    @InjectRepository(FavoriteService) private favoriteRepo: Repository<FavoriteService>,
    @InjectRepository(Appointments) private appointmentRepo: Repository<Appointments>,
    @InjectRepository(PrestaReview) private reviewRepo: Repository<PrestaReview>,
    @InjectRepository(PrestaReviewResponse) private reviewResponseRepo: Repository<PrestaReviewResponse>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(ProviderKeywordsList)
    private keywordListRepo: Repository<ProviderKeywordsList>,
    @InjectRepository(ProviderKeywords)
    private keywordRepo: Repository<ProviderKeywords>,
    private readonly minioService: MinioService
  ) {}

  async createService(
    data: any,
    files: Express.Multer.File[],
    user_id: string
  ) {
    const provider = await this.providerRepo.findOne({
      where: { user: { user_id } },
    });

    console.log("data" + JSON.stringify(data));

    if (!provider) throw new Error('Provider not found');

    const service = this.serviceRepo.create({
      service_type: data.service_type,
      status: data.status,
      validated: data.validated === 'true',
      name: data.name,
      description: data.description,
      city: data.city,
      price: data.price,
      duration_minute: data.duration_minute,
      available: data.available !== 'false',
    });

    const savedService = await this.serviceRepo.save(service);

    await this.serviceRepo.manager.insert('services', {
      provider_id: provider.provider_id,
      service_id: savedService.service_id,
    });

    const imageFiles = files.filter(file =>
      ['image1', 'image2', 'image3', 'image4', 'image5'].includes(file.fieldname)
    );
    
    for (const file of imageFiles) {
      const fileExt = path.extname(file.originalname);
      const fileName = `${uuidv4()}${fileExt}`;
      const filePath = `${provider.provider_id}/service/${savedService.service_id}/images/${fileName}`;
    
      await this.minioService.uploadFileToBucket('provider-images', filePath, file);
    
      const image = this.imageRepo.create({
        serviceList: savedService,
        image_service_url: filePath,
      });
    
      await this.imageRepo.save(image);
    }

    const keywords = Array.isArray(data.keywords)
      ? data.keywords
      : typeof data.keywords === 'string'
        ? [data.keywords]
        : [];

    for (const keyword of keywords) {
      let keywordEntry = await this.keywordListRepo.findOne({ where: { keyword } });

      if (!keywordEntry) {
        keywordEntry = this.keywordListRepo.create({ keyword });
        await this.keywordListRepo.save(keywordEntry);
      }

      const providerKeyword = this.keywordRepo.create({
        provider_keyword_id: keywordEntry.provider_keyword_id,
        service_id: savedService.service_id,
      });

      await this.keywordRepo.save(providerKeyword);
    }

    return savedService;
  }

  async getMyServices(user_id: string, page: number, limit: number) {
    const provider = await this.providerRepo.findOne({
      where: { user: { user_id } },
    });

    console.log("provider", provider?.provider_id);
  
    if (!provider) {
      throw new Error('Provider not found');
    }
  
    const serviceLinks = await this.serviceRepo.manager.find('services', {
      where: { provider_id: provider.provider_id },
      skip: (page - 1) * limit,
      take: limit,
    });
  
    const total = await this.serviceRepo.manager.count('services', {
      where: { provider_id: provider.provider_id },
    });
  
    const serviceIds = serviceLinks.map((link: any) => link.service_id);
  
    const services = await this.serviceRepo.findByIds(serviceIds);
  
    const formatted = services.map(service => ({
      id: service.service_id,
      name: service.name,
      description: service.description,
      type: service.service_type,
      city: service.city,
      price: service.price,
      duration: service.duration_minute,
      available: service.available,
      status: service.status,
      validated: service.validated,
    }));
  
    return {
      data: formatted,
      total,
      page,
      limit,
    };
  }

  async getValidatedServices(page = 1, limit = 10, search = '', city = '') {
    const skip = (page - 1) * limit;
    const [result, total] = await this.serviceRepo.findAndCount({
      where: {
        validated: true,
        name: Like(`%${search}%`),
        ...(city && { city: Like(`%${city}%`) }),
      },
      take: limit,
      skip,
    });

    return { data: result, meta: { total, page, limit } };
  }

  async getServiceDetails(service_id: string) {
    const service = await this.serviceRepo.findOne({
      where: { service_id },
      relations: ['images'],
    });

    if (!service) throw new NotFoundException('Service introuvable');
    return service;
  }

  async createAppointment(service_id: string, data: any) {
    const appointment = this.appointmentRepo.create({
      service_payment_id: data.service_payment_id,
      stripe_payment_id: data.stripe_payment_id,
      amount: data.amount,
      commission: data.commission,
      status: data.status,
      service_date: data.service_date,
      payment_date: data.payment_date,
      client: { client_id: data.client_id }, // 🔥 ici on met bien l'objet lié
      service: { service_id }, // 🔥 via l'URL
      provider: { provider_id: data.provider_id }, // si besoin
      presta_commission: { provider_commission_id: data.presta_commission_id },
    });
  
    return this.appointmentRepo.save(appointment);
  }
  

  async getServiceAppointments(service_id: string) {
    return this.appointmentRepo.find({ where: { service: { service_id } } });
  }

  async updateService(id: string, data: Partial<ServicesList>) {
    const service = await this.serviceRepo.findOneBy({ service_id: id });
    if (!service) throw new NotFoundException('Service non trouvé');
    Object.assign(service, data);
    return this.serviceRepo.save(service);
  }

  async deleteService(id: string) {
    const result = await this.serviceRepo.delete(id);
    if (!result.affected) throw new NotFoundException('Service introuvable');
    return { message: 'Service supprimé' };
  }

  async addFavorite(service_id: string, user_id: string) {
    const favorite = this.favoriteRepo.create({ service_id, user_id });
    return this.favoriteRepo.save(favorite);
  }

  async removeFavorite(service_id: string, user_id: string) {
    const favorite = await this.favoriteRepo.findOne({ where: { service_id, user_id } });
    if (!favorite) throw new NotFoundException('Favori introuvable');
    await this.favoriteRepo.remove(favorite);
    return { message: 'Favori supprimé' };
  }

  async addComment(service_id: string, client_id: string, content: string, rating: number) {
    // Vérifie si un RDV existe pour ce user et ce service
    const appointment = await this.appointmentRepo.findOne({
      where: { client: { client_id }, service: { service_id } }
    });
  
    if (!appointment) throw new NotFoundException('Aucun rendez-vous trouvé pour ce service');
  
    const review = this.reviewRepo.create({
      rating,
      comment: content,
      appointment: appointment,
    });
  
    return await this.reviewRepo.save(review);
  }
  
  async replyToComment(review_presta_id: string, provider_id: string, content: string) {
    // Optionnel : vérifier que le prestataire est bien lié à ce review via appointment
    const review = await this.reviewRepo.findOne({
      where: { review_presta_id },
      relations: ['appointment', 'appointment.provider']
    });
  
    if (!review || review.appointment.provider.provider_id !== provider_id) {
      throw new NotFoundException('Le prestataire ne peut pas répondre à ce commentaire');
    }
  
    const response = this.reviewResponseRepo.create({
      comment: content,
      review: review,
    });
  
    return await this.reviewResponseRepo.save(response);
  }
  
}

