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

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(ServicesList) private serviceRepo: Repository<ServicesList>,
    @InjectRepository(ServiceImage) private imageRepo: Repository<ServiceImage>,
    @InjectRepository(Providers) private providerRepo: Repository<Providers>,
    @InjectRepository(Services) private linkRepo: Repository<Services>,
    @InjectRepository(FavoriteService) private favoriteRepo: Repository<FavoriteService>,
    @InjectRepository(Appointments) private appointmentRepo: Repository<Appointments>,
    @InjectRepository(ProviderKeywords) private keywordRepo: Repository<ProviderKeywords>,
    @InjectRepository(PrestaReview) private reviewRepo: Repository<PrestaReview>,
    @InjectRepository(PrestaReviewResponse) private reviewResponseRepo: Repository<PrestaReviewResponse>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
  ) {}

  async createService(data: Partial<ServicesList>) {
    const service = this.serviceRepo.create(data);
    return this.serviceRepo.save(service);
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

