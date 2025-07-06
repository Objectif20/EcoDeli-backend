import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';

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
import { ProviderCommission } from 'src/common/entities/provider_commissions.entity';
import { Users } from 'src/common/entities/user.entity';
import { StripeService } from 'src/common/services/stripe/stripe.service';
import { FutureAppointmentProvider } from './type';
import { PdfService } from 'src/common/services/pdf/pdf.service';
import * as nodemailer from 'nodemailer';
import { Readable } from 'stream';

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
    @InjectRepository(ProviderCommission) private commissionRepo: Repository<ProviderCommission>,
    @InjectRepository(Client) private clientRepo: Repository<Client>,
    @InjectRepository(Users) private userRepo: Repository<Users>,
    @InjectRepository(ProviderKeywordsList)
    private keywordListRepo: Repository<ProviderKeywordsList>,
    @InjectRepository(ProviderKeywords)
    private keywordRepo: Repository<ProviderKeywords>,
    private readonly minioService: MinioService,
    private readonly stripeService: StripeService, 
    private readonly pdfService : PdfService,
    @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
    
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

    const queryBuilder = this.serviceRepo.createQueryBuilder('serviceList')
        .leftJoinAndSelect('serviceList.services', 'services')
        .leftJoinAndSelect('services.provider', 'provider')
        .leftJoinAndSelect('provider.user', 'user')
        .leftJoinAndSelect('serviceList.images', 'images')
        .leftJoinAndSelect('serviceList.keywords', 'keywords')
        .leftJoinAndSelect('keywords.keywordList', 'keywordList')
        .leftJoinAndSelect('serviceList.appointments', 'appointments')
        .leftJoinAndSelect('appointments.review_presta', 'reviews')
        .leftJoinAndSelect('reviews.responses', 'responses')
        .leftJoinAndSelect('appointments.client', 'client')
        .where('serviceList.validated = :validated', { validated: true })
        .andWhere('serviceList.name LIKE :search', { search: `%${search}%` });

    if (city) {
        queryBuilder.andWhere('serviceList.city LIKE :city', { city: `%${city}%` });
    }

    queryBuilder.take(limit).skip(skip);

    const [result, total] = await queryBuilder.getManyAndCount();

    const services = await Promise.all(result.map(async (serviceList) => {
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
            rate: providerAppointments.reduce((acc, appointment) => acc + (appointment.review_presta?.rating || 0), 0) / (providerAppointments.filter(appointment => appointment.review_presta).length || 1),
            comments: await Promise.all(providerAppointments.flatMap(async (appointment) => {
                if (appointment.review_presta) {
                    const clientPhotoUrl = appointment.client.user
                        ? await this.minioService.generateImageUrl('client-images', appointment.client.user.profile_picture)
                        : null;

                    const responseAuthorPhotoUrl = firstService && firstService.provider && firstService.provider.user
                        ? await this.minioService.generateImageUrl('client-images', firstService.provider.user.profile_picture)
                        : null;

                    return [{
                        id: appointment.review_presta.review_presta_id,
                        author: {
                            id: appointment.client.client_id,
                            name: `${appointment.client.first_name} ${appointment.client.last_name}`,
                            photo: clientPhotoUrl,
                        },
                        content: appointment.review_presta.comment,
                        response: appointment.review_presta.responses?.length ? {
                            id: appointment.review_presta.responses[0].review_presta_response_id,
                            author: {
                                id: firstService.provider.provider_id,
                                name: `${firstService.provider.first_name} ${firstService.provider.last_name}`,
                                photo: responseAuthorPhotoUrl,
                            },
                            content: appointment.review_presta.responses[0].comment,
                        } : undefined,
                    }];
                }
                return [];
            })),
        };
    }));

    console.log("services", services);

    return { data: services, meta: { total, page, limit } };
}

  async getServiceDetails(service_id: string) {
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

    const comments = await Promise.all(providerAppointments.flatMap(async (appointment) => {
      if (appointment.review_presta) {
        const clientPhotoUrl = appointment.client.user
          ? await this.minioService.generateImageUrl('client-images', appointment.client.user.profile_picture)
          : null;

        const responseAuthorPhotoUrl = firstService && firstService.provider && firstService.provider.user
          ? await this.minioService.generateImageUrl('client-images', firstService.provider.user.profile_picture)
          : null;

        return [{
          id: appointment.review_presta.review_presta_id,
          author: {
            id: appointment.client.client_id,
            name: `${appointment.client.first_name} ${appointment.client.last_name}`,
            photo: clientPhotoUrl,
          },
          content: appointment.review_presta.comment,
          response: appointment.review_presta.responses?.length ? {
            id: appointment.review_presta.responses[0].review_presta_response_id,
            author: {
              id: firstService.provider.provider_id,
              name: `${firstService.provider.first_name} ${firstService.provider.last_name}`,
              photo: responseAuthorPhotoUrl,
            },
            content: appointment.review_presta.responses[0].comment,
          } : undefined,
        }];
      }
      return [];
    }));

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

  async createAppointment(service_id: string, data: {user_id: string; service_date: Date }) {

    const client = await this.clientRepo.findOne({
      where: { user: { user_id: data.user_id } },
    });
    if (!client) throw new NotFoundException('Client non trouvé');

    const service = await this.serviceRepo.findOne({
      where: { service_id },
    });
    if (!service) throw new NotFoundException('Service non trouvé');

    const provider = await this.providerRepo.findOne({
      where: { services: { service_id } },
    });
    if (!provider) throw new NotFoundException('Prestataire non trouvé');

    const commission = await this.commissionRepo.find();
    if (!commission) throw new NotFoundException('Commission non trouvée');
    const commissionValue = commission[0].value;
    
    const appointment = this.appointmentRepo.create({
      amount: service.price,
      status: 'pending',
      service_date: data.service_date,
      duration: service.duration_minute,
      commission: commissionValue,
      presta_commission : commission[0],
      client,
      service,
      provider,
    });

    const savedAppointment = await this.appointmentRepo.save(appointment);

    if (!savedAppointment) {
      throw new NotFoundException('Erreur lors de la création du rendez-vous');
    }

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

  async addComment(appointment_id: string, user_id: string, content: string, rating: number) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id },
      relations: ['client', 'service'],
    });
    if (!appointment) throw new NotFoundException('Aucun rendez-vous trouvé pour ce service');

    const client = await this.clientRepo.findOne({
      where: { user: { user_id } },
    });
    if (!client) throw new NotFoundException('Client non trouvé');

    if (client.client_id !== appointment.client.client_id) {
      throw new NotFoundException('Le client ne peut pas commenter ce service');
    }
  
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

  async getMyServiceReviewsAsClient(user_id: string, page = 1, limit = 10): Promise<any> {
    const client = await this.clientRepo.findOne({
      where: { user: { user_id } },
      relations: ['user'],
    });
  
    if (!client) {
      throw new Error('Client not found');
    }
  
    const [reviews, totalRows] = await this.reviewRepo.findAndCount({
      where: { appointment: { client: { client_id: client.client_id } } },
      relations: ['appointment', 'appointment.provider', 'appointment.service', 'appointment.provider.user'],
      skip: (page - 1) * limit,
      take: limit,
    });
  
    const reviewsList = await Promise.all(
      reviews.map(async (review) => {
        const appointment = review.appointment;
        const provider = appointment.provider;
        const providerUser = provider.user;
        const service = appointment.service;
  
        return {
          id: review.review_presta_id,
          content: review.comment,
          provider: {
            id: provider.provider_id,
            name: `${provider.first_name} ${provider.last_name}`,
            photo: providerUser?.profile_picture
              ? await this.minioService.generateImageUrl('client-images', providerUser.profile_picture)
              : null,
          },
          date: appointment.service_date.toISOString().split('T')[0],
          service_name: service.name,
          rate: review.rating,
        };
      })
    );
  
    const totalPages = Math.ceil(totalRows / limit);
  
    return {
      data: reviewsList,
      totalRows,
      totalPages,
      currentPage: page,
      limit,
    };
  }

  async getProviderDisponibility(service_id: string) {

    const service = await this.serviceRepo.findOne({
      where: { service_id },
    });
  
    const provider = await this.providerRepo.findOne({
      where: { services: { service_id } },
      relations: ['availabilities'], 
    });
    
    if (!service) throw new NotFoundException('Service non trouvé');
    if (!provider) throw new NotFoundException('Prestataire non trouvé');
  
    const availabilities = provider.availabilities;
  
    const appointments = await this.appointmentRepo.find({
      where: { provider: provider },
    });
  
    const formattedAppointments = appointments.map(appointment => ({
      date: appointment.service_date.toISOString().split('T')[0],
      time: appointment.service_date.toISOString().split('T')[1].substring(0, 5),
      end: new Date(appointment.service_date.getTime() + appointment.duration * 60000)
      .toISOString()
      .split('T')[1]
      .substring(0, 5),
    }));
  
    const providerDisponibilities = {
      availabilities,
      appointments: formattedAppointments,
    }

    return providerDisponibilities
  }

  async getReviewsByUserId(userId: string, page = 1, limit = 10): Promise<any> {
    const provider = await this.providerRepo.findOne({
      where: { user: { user_id: userId } },
      relations: ['user'],
    });
  
    if (!provider) {
      throw new Error('Provider not found');
    }
  
    const appointments = await this.appointmentRepo.find({
      where: { provider: { provider_id: provider.provider_id } },
      relations: ['review_presta', 'service', 'client', 'client.user'],
    });
  
    const reviews = await Promise.all(appointments.map(async (appointment) => {
      if (!appointment.review_presta) {
        return null;
      }
  
      const review = appointment.review_presta;
      const client = appointment.client;
      const user = client.user;
  
      const response = await this.reviewResponseRepo.findOne({
        where: { review: { review_presta_id: review.review_presta_id } },
      });

      const clientPhotoUrl = user.profile_picture ? await this.minioService.generateImageUrl('client-images', user.profile_picture) : null;
  
      return {
        id: review.review_presta_id,
        content: review.comment,
        author: {
          id: user.user_id,
          name: `${client.first_name} ${client.last_name}`,
          photo: clientPhotoUrl,
        },
        reply: !!response,
        reply_content: response?.comment || null,
        date: appointment.service_date.toISOString().split('T')[0],
        services_name: appointment.service.name,
        rate: review.rating,
      };
    }));
  
    const filteredReviews = reviews.filter(review => review !== null);
  
    const totalRows = filteredReviews.length;
    const totalPages = Math.ceil(totalRows / limit);
    const startIndex = (page - 1) * limit;
    const paginatedReviews = filteredReviews.slice(startIndex, startIndex + limit);
  
    return {
      data: paginatedReviews,
      totalRows,
      totalPages,
      currentPage: page,
      limit,
    };
  }

  async replyToReview(reviews_id: string, user_id : string, content: string) {

      const provider = await this.providerRepo.findOne({
        where: { user: { user_id } },
        relations: ['user'],
      });

      if (!provider) {
        throw new Error('Provider not found');
      }

      const review = await this.reviewRepo.findOne({
        where: { review_presta_id: reviews_id },
      });
      if (!review) {
        throw new Error('Review not found');
      }

      const response = this.reviewResponseRepo.create({
        comment: content,
        review: review,
      });
      const savedResponse = await this.reviewResponseRepo.save(response);
      if (!savedResponse) {
        throw new Error('Error saving response');
      }

      return { reply : "ok" }
  }

  async getMyServicesHistory(userId: string, page = 1, limit = 10): Promise<any> {
    const provider = await this.providerRepo.findOne({
      where: { user: { user_id: userId } },
      relations: ['user'],
    });
  
    if (!provider) {
      throw new Error('Provider not found');
    }
  
    const appointments = await this.appointmentRepo.find({
      where: { provider: { provider_id: provider.provider_id }, status: In(['completed', 'cancelled']) },
      relations: ['client', 'client.user', 'service', 'review_presta'],
      order: { service_date: 'DESC' },
    });
  
    const servicesHistory = await Promise.all(
      appointments.map(async (appointment) => {
        const client = appointment.client;
        const user = client.user;
        const service = appointment.service;
    
        return {
          id: appointment.appointment_id,
          clientName: `${client.first_name} ${client.last_name}`,
          clientImage: user.profile_picture 
            ? await this.minioService.generateImageUrl('client-images', user.profile_picture)
            : null,
          date: appointment.service_date.toISOString().split('T')[0],
          time: appointment.service_date.toISOString().split('T')[1].slice(0,5), 
          serviceName: service.name,
          rating: appointment.review_presta ? appointment.review_presta.rating : null,
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

  async getMyServiceHistoryAsClient(userId: string, page = 1, limit = 10): Promise<any> {
    const client = await this.clientRepo.findOne({
      where: { user: { user_id: userId } },
      relations: ['user'],
    });
  
    if (!client) {
      throw new Error('Client not found');
    }
  
    const appointments = await this.appointmentRepo.find({
      where: { client: { client_id: client.client_id }, status: In(['completed', 'cancelled']) },
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

  async startAppointment(appointment_id: string, user_id: string, code : string) {

    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id },
      relations: ['service', 'provider', 'client'],
    });

    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    const provider = await this.providerRepo.findOne({
      where: { user: { user_id } },
    });

    if (!provider || provider.provider_id !== appointment.provider.provider_id) {
      throw new NotFoundException('Prestataire non autorisé à démarrer ce rendez-vous');
    }

    if (appointment.status !== 'pending') {
      throw new Error('Le rendez-vous n\'est pas dans un état valide pour démarrer');
    }

    if (code == appointment.code) {
      appointment.status = 'in_progress';

      const client = await this.clientRepo.findOne({
        where: { user: { user_id: appointment.client.user.user_id } },
        relations: ['user'],
      });

      if (!client) {
        throw new NotFoundException('Client non trouvé');
      }

      if (!client.stripe_customer_id) {
        throw new NotFoundException('Client n\'a pas de compte Stripe associé');
      }

      const price = Math.round(appointment.amount * 1.015 + 0.25);

      const { stripePaymentIntentId } = await this.stripeService.chargeCustomer(
          client.stripe_customer_id,
          Math.round(price * 100),
          `Prélèvement pour ${appointment.service.name}`,
      );

      appointment.stripe_payment_id = stripePaymentIntentId;

      const pdfBuffer = await this.pdfService.generateAppointmentInvoicePdf({
          appointmentId: appointment.appointment_id,
          appointmentDate: appointment.service_date.toISOString().split('T')[0],
          appointmentTime: appointment.service_date.toISOString().split('T')[1].slice(0, 5),
          amount: appointment.amount,
          serviceName: appointment.service.name,
          serviceDescription: appointment.service.description,
          providerName: `${appointment.provider.first_name} ${appointment.provider.last_name}`,
          providerEmail: appointment.provider.user.email,
          clientName: `${appointment.client.first_name} ${appointment.client.last_name}`,
        });

        const fromEmail = this.mailer.options.auth.user;
        await this.mailer.sendMail({
          from: fromEmail,
          to: appointment.client.user.email,
          subject: 'Votre Facture de Livraison',
          text: 'Veuillez trouver ci-joint votre facture de livraison.',
          attachments: [
              {
                  filename: `facture_${appointment.appointment_id}.pdf`,
                  content: pdfBuffer,
              },
          ],
      });

        const file: Express.Multer.File = {
            fieldname: 'file',
            originalname: `facture_${appointment.appointment_id}.pdf`,
            encoding: '7bit',
            mimetype: 'application/pdf',
            buffer: pdfBuffer,
            size: pdfBuffer.length,
            destination: '', 
            filename: `facture_${appointment.appointment_id}.pdf`,
            path: '', 
            stream: Readable.from(pdfBuffer),
            };

          const filePath = `services/${appointment.service.service_id}/appointments/${appointment.appointment_id}/facture_${appointment.appointment_id}.pdf`;
          await this.minioService.uploadFileToBucket('client-documents', filePath, file);

        appointment.url_file = filePath;
        appointment.payment_date = new Date();
        appointment.refund_date = null;

        await this.appointmentRepo.save(appointment);
    }

    return this.appointmentRepo.save(appointment);

  }

  async finishAppointment(appointment_id: string, user_id: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { appointment_id },
      relations: ['provider'],
    }); 
    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }
    const provider = await this.providerRepo.findOne({
      where: { user: { user_id } },
    });
    if (!provider || provider.provider_id !== appointment.provider.provider_id) {
      throw new NotFoundException('Prestataire non autorisé à terminer ce rendez-vous');
    }
    if (appointment.status !== 'in_progress') {
      throw new Error('Le rendez-vous n\'est pas dans un état valide pour terminer');
    }
    appointment.status = 'completed';
    appointment.payment_date = new Date();
    appointment.refund_date = null;

    provider.balance += appointment.amount;

    await this.providerRepo.save(provider);

  }

  async getMyFutureAppointmentsAsProvider(userId: string, page = 1, limit = 10): Promise<{data : FutureAppointmentProvider[], totalRows: number, totalPages: number, currentPage: number, limit: number}> {

    const provider = await this.providerRepo.findOne({
      where: { user: { user_id: userId } },
      relations: ['user'],
    });
    if (!provider) {
      throw new Error('Provider not found');
    }
    const appointments = await this.appointmentRepo.find({
      where: { provider: { provider_id: provider.provider_id }, status: In(["pending", "in_progress"]) },
      relations: ['client', 'client.user', 'service'],
      order: { service_date: 'ASC' },
    });
    const formattedAppointments = await Promise.all(appointments.map(async appointment => ({
      id: appointment.appointment_id,
      clientName: `${appointment.client.first_name} ${appointment.client.last_name}`,
      clientImage: appointment.client.user.profile_picture
        ? await this.minioService.generateImageUrl('client-images', appointment.client.user.profile_picture)
        : null,
      date: appointment.service_date.toISOString().split('T')[0],
      time: appointment.service_date.toISOString().split('T')[1].slice(0, 5),
      serviceName: appointment.service.name,
      status: appointment.status,
    })));

    const totalRows = formattedAppointments.length;
    const totalPages = Math.ceil(totalRows / limit);
    const startIndex = (page - 1) * limit;
    const paginatedAppointments = formattedAppointments.slice(startIndex, startIndex + limit);
    return {
      data: paginatedAppointments,
      totalRows,
      totalPages,
      currentPage: page,
      limit,
    };
  }

}

