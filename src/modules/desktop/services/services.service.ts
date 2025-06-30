import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServicesList } from 'src/common/entities/services_list.entity';
import { MyServicesResponse, ServiceDetails } from './type';
import { MinioService } from 'src/common/services/file/minio.service';
import { Subscription } from 'src/common/entities/subscription.entity';
import { DeliveryTransfer } from 'src/common/entities/delivery_transfer.entity';
import { Transfer } from 'src/common/entities/transfers.entity';
import { Appointments } from 'src/common/entities/appointments.entity';
import { TransferProvider } from 'src/common/entities/transfers_provider.entity';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(ServicesList)
    private readonly servicesListRepository: Repository<ServicesList>,

    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,

    @InjectRepository(DeliveryTransfer)
    private readonly deliveryTransferRepository: Repository<DeliveryTransfer>,

    @InjectRepository(Transfer)
    private readonly transferRepository: Repository<Transfer>,

    @InjectRepository(Appointments)
    private readonly appointmentsRepository: Repository<Appointments>,

    @InjectRepository(TransferProvider)
    private readonly transferProviderRepository: Repository<TransferProvider>,

    private readonly minioService: MinioService,
  ) {}

  async getAllServices(page = 1, limit = 10): Promise<MyServicesResponse> {
    const offset = (page - 1) * limit;

    const [services, total] = await this.servicesListRepository.findAndCount({
      skip: offset,
      take: limit,
      order: { name: 'ASC' },
      relations: ['appointments', 'appointments.review_presta'],
    });

    const data = services.map((service) => {
      const validReviews = service.appointments.filter((a) => a.review_presta);
      const rate =
        validReviews.reduce(
          (sum, a) => sum + (a.review_presta?.rating || 0),
          0,
        ) / (validReviews.length || 1);
      return {
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
        rate: parseFloat(rate.toFixed(1)),
      };
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }
  async getServiceDetails(service_id: string): Promise<ServiceDetails> {
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

    const imageUrls = await Promise.all(
      serviceList.images.map((image) =>
        this.minioService.generateImageUrl(
          'provider-images',
          image.image_service_url,
        ),
      ),
    );

    const authorPhotoUrl =
      firstService && firstService.provider && firstService.provider.user
        ? await this.minioService.generateImageUrl(
            'client-images',
            firstService.provider.user.profile_picture,
          )
        : null;

    const commentsNested = await Promise.all(
      providerAppointments.map(async (appointment) => {
        if (appointment.review_presta) {
          const clientPhotoUrl = appointment.client.user
            ? await this.minioService.generateImageUrl(
                'client-images',
                appointment.client.user.profile_picture,
              )
            : null;

          const responseAuthorPhotoUrl =
            firstService && firstService.provider && firstService.provider.user
              ? await this.minioService.generateImageUrl(
                  'client-images',
                  firstService.provider.user.profile_picture,
                )
              : null;

          return {
            id: appointment.review_presta.review_presta_id,
            author: {
              id: appointment.client.client_id,
              name: `${appointment.client.first_name} ${appointment.client.last_name}`,
              photo: clientPhotoUrl,
            },
            content: appointment.review_presta.comment ?? '',
            response: appointment.review_presta.responses?.length
              ? {
                  id: appointment.review_presta.responses[0]
                    .review_presta_response_id,
                  author: {
                    id: firstService.provider.provider_id,
                    name: `${firstService.provider.first_name} ${firstService.provider.last_name}`,
                    photo: responseAuthorPhotoUrl,
                  },
                  content: appointment.review_presta.responses[0].comment,
                }
              : undefined,
          };
        }
        return null;
      }),
    );
    const comments = commentsNested.filter(
      (c): c is NonNullable<typeof c> => c !== null,
    );

    const rate =
      providerAppointments.reduce(
        (acc, appointment) => acc + (appointment.review_presta?.rating || 0),
        0,
      ) /
      (providerAppointments.filter((appointment) => appointment.review_presta)
        .length || 1);

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
      keywords: serviceList.keywords.map(
        (keyword) => keyword.keywordList.keyword,
      ),
      images: imageUrls,
      description: serviceList.description,
      author:
        firstService && firstService.provider && firstService.provider.user
          ? {
              id: firstService.provider.provider_id,
              name: `${firstService.provider.first_name} ${firstService.provider.last_name}`,
              email: firstService.provider.user.email,
              photo: authorPhotoUrl,
            }
          : null,
      rate,
      comments,
    };
  }

  async getTop5MostRequestedServicesSimple(): Promise<
    { id: string; name: string; count: number }[]
  > {
    const topServices = await this.servicesListRepository
      .createQueryBuilder('service')
      .leftJoin('service.appointments', 'appointment')
      .select('service.service_id', 'id')
      .addSelect('service.name', 'name')
      .addSelect('COUNT(appointment.appointment_id)', 'count')
      .groupBy('service.service_id')
      .addGroupBy('service.name')
      .orderBy('count', 'DESC')
      .limit(5)
      .getRawMany();

    return topServices.map((service) => ({
      id: service.id,
      name: service.name,
      count: Number(service.count),
    }));
  }

  async getAppointmentDistributionOverTime(): Promise<
    { label: string; count: number }[]
  > {
    const allAppointments = await this.servicesListRepository
      .createQueryBuilder('service')
      .leftJoin('service.appointments', 'appointment')
      .select(['appointment.service_date AS date'])
      .where('appointment.service_date IS NOT NULL')
      .getRawMany();

    if (allAppointments.length === 0) return [];

    const dates = allAppointments.map((a) => new Date(a.date));

    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));

    const diffTime = maxDate.getTime() - minDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    const diffMonths =
      (maxDate.getFullYear() - minDate.getFullYear()) * 12 +
      (maxDate.getMonth() - minDate.getMonth());

    let groupBy: 'month' | 'week' | 'day' = 'month';
    if (diffMonths < 2 && diffDays > 14) {
      groupBy = 'week';
    } else if (diffDays <= 14) {
      groupBy = 'day';
    }

    const distribution = new Map<string, number>();

    for (const d of dates) {
      let label = '';

      if (groupBy === 'month') {
        label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekNumber = getWeekNumber(d);
        label = `S${weekNumber}-${d.getFullYear()}`;
      } else {
        label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      distribution.set(label, (distribution.get(label) || 0) + 1);
    }

    const sortedEntries = Array.from(distribution.entries()).sort(([a], [b]) =>
      a < b ? -1 : 1,
    );

    return sortedEntries.map(([label, count]) => ({ label, count }));
  }

async getSalesRevenue(): Promise<{ label: string; revenue: number }[]> {
  const yearStart = new Date('2025-01-01T00:00:00Z');
  const yearEnd = new Date('2025-12-31T23:59:59Z');

  const subscriptions = await this.subscriptionRepository.find({ relations: ['plan'] });

  let abonnementRevenue = 0;
  for (const sub of subscriptions) {
    const endDate = sub.end_date || new Date();
    const durationDays = getActiveDurationIn2025(sub.start_date, endDate);
    if (durationDays <= 0) continue;

    const pricePerYear = Number(sub.plan.price || 0);
    const revenue = (pricePerYear * durationDays) / 365;
    abonnementRevenue += revenue;
  }

  const prestationAppointments = await this.appointmentsRepository
    .createQueryBuilder('appointment')
    .where('appointment.status = :status', { status: 'in_progress' })
    .andWhere('appointment.service_date BETWEEN :start AND :end', { start: yearStart, end: yearEnd })
    .getMany();

  let prestationRevenue = 0;
  prestationAppointments.forEach((appt) => {
    prestationRevenue += Number(appt.amount || 0);
  });

  const deliveryTransferSum = await this.deliveryTransferRepository
    .createQueryBuilder('dt')
    .select('SUM(dt.amount)', 'sum')
    .where('dt.date BETWEEN :start AND :end', { start: yearStart, end: yearEnd })
    .getRawOne();

  const deliveryRevenue = Number(deliveryTransferSum.sum) || 0;

  const totalRevenue = abonnementRevenue + prestationRevenue + deliveryRevenue;

  console.log('Abonnement Revenue:', abonnementRevenue);
  console.log('Prestation Revenue:', prestationRevenue);
  console.log('Delivery Revenue:', deliveryRevenue);
  console.log('Total Revenue:', totalRevenue);

  return [
    { label: 'Abonnement', revenue: abonnementRevenue },
    { label: 'Prestations', revenue: prestationRevenue },
    { label: 'Livraisons', revenue: deliveryRevenue },
  ];
}


}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}


function getActiveDurationIn2025(startDate: Date, endDate: Date): number {
  const yearStart = new Date('2025-01-01T00:00:00Z');
  const yearEnd = new Date('2025-12-31T23:59:59Z');

  const start = startDate > yearStart ? startDate : yearStart;
  const end = endDate < yearEnd ? endDate : yearEnd;

  if (start > end) return 0;

  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24) + 1;

  return diffDays;
}