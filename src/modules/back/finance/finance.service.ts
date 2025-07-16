import { Injectable } from '@nestjs/common';
import {
  DashboardStats,
  StripeStats,
  Transaction,
  TransactionCategory,
  TransactionType,
} from './type';
import * as fs from 'fs';
import * as path from 'path';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { Appointments } from 'src/common/entities/appointments.entity';
import { DeliveryTransfer } from 'src/common/entities/delivery_transfer.entity';
import { TransferProvider } from 'src/common/entities/transfers_provider.entity';
import { Transfer } from 'src/common/entities/transfers.entity';
import { SubscriptionTransaction } from 'src/common/entities/subscription_transaction.entity';
import { MinioService } from 'src/common/services/file/minio.service';
import { StripeService } from 'src/common/services/stripe/stripe.service';
import { Shipment } from 'src/common/entities/shipment.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { format, formatISO, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Delivery } from 'src/common/entities/delivery.entity';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Appointments)
    private readonly appointmentsRepo: Repository<Appointments>,
    @InjectRepository(DeliveryTransfer)
    private readonly deliveryTransferRepo: Repository<DeliveryTransfer>,
    @InjectRepository(TransferProvider)
    private readonly transferProviderRepo: Repository<TransferProvider>,
    @InjectRepository(Transfer)
    private readonly transferRepo: Repository<Transfer>,
    @InjectRepository(SubscriptionTransaction)
    private readonly subscriptionTransactionRepo: Repository<SubscriptionTransaction>,
    @InjectRepository(Shipment)
    private readonly shipmentsRepository: Repository<Shipment>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(Delivery)
    private readonly deliveryRepository: Repository<Delivery>,
    private readonly minioService: MinioService,
    private readonly stripeService: StripeService,
  ) {}

  async _fetchTransactions(params: {
    name?: string;
    type?: TransactionType;
    year?: string;
    month?: string;
  }): Promise<Transaction[]> {
    let allTransactions: Transaction[] = [];

    if (!params.type || params.type === 'in') {
      const appointments = await this.appointmentsRepo.find({
        relations: ['client', 'service'],
        where: { status: In(['completed', 'in_progress']) },
      });

      const filteredAppointments = appointments.filter((appointment) => {
        const date = appointment.payment_date || appointment.service_date;
        const matchesYear = params.year ? date.getFullYear().toString() === params.year : true;
        const matchesMonth = params.month
          ? (date.getMonth() + 1).toString() === params.month
          : true;
        const fullName =
          `${appointment.client?.first_name || ''} ${appointment.client?.last_name || ''}`.trim();
        const matchesName = params.name
          ? fullName.toLowerCase().includes(params.name.toLowerCase())
          : true;

        return matchesYear && matchesMonth && matchesName;
      });

      const mappedAppointments = await Promise.all(
        filteredAppointments.map(async (appointment) => ({
          id: appointment.appointment_id,
          name: `${appointment.client?.first_name || ''} ${appointment.client?.last_name || ''}`.trim(),
          type: 'in' as TransactionType,
          category: 'service' as TransactionCategory,
          date: (appointment.payment_date || appointment.service_date).toISOString().split('T')[0],
          invoiceUrl: appointment.url_file
            ? await this.minioService.generateImageUrl('client-documents', appointment.url_file)
            : '',
        })),
      );

      allTransactions.push(...mappedAppointments);
    }

    if (!params.type || params.type === 'in') {
      const deliveries = await this.deliveryTransferRepo.find({
        relations: [
          'delivery',
          'delivery.shipment',
          'delivery.shipment.user',
          'delivery.shipment.user.clients',
          'delivery.shipment.user.merchant',
        ],
      });

      const filteredDeliveries = deliveries.filter((delivery) => {
        const date = delivery.date;
        const matchesYear = params.year ? date.getFullYear().toString() === params.year : true;
        const matchesMonth = params.month
          ? (date.getMonth() + 1).toString() === params.month
          : true;

        const user = delivery.delivery.shipment?.user;
        let name = '';
        if (user?.clients?.length > 0) {
          name = `${user.clients[0]?.first_name || ''} ${user.clients[0]?.last_name || ''}`.trim();
        } else if (user?.merchant) {
          name = `${user.merchant?.first_name || ''} ${user.merchant?.last_name || ''}`.trim();
        }

        const matchesName = params.name
          ? name.toLowerCase().includes(params.name.toLowerCase())
          : true;

        return matchesYear && matchesMonth && matchesName;
      });

      const mappedDeliveries = await Promise.all(
        filteredDeliveries.map(async (delivery) => {
          const user = delivery.delivery.shipment?.user;
          let name = '';
          if (user?.clients?.length > 0) {
            name =
              `${user.clients[0]?.first_name || ''} ${user.clients[0]?.last_name || ''}`.trim();
          } else if (user?.merchant) {
            name = `${user.merchant?.first_name || ''} ${user.merchant?.last_name || ''}`.trim();
          }

          return {
            id: delivery.delivery_transfer_id,
            name,
            type: 'in' as TransactionType,
            category: 'delivery' as TransactionCategory,
            date: delivery.date.toISOString().split('T')[0],
            invoiceUrl: delivery.url
              ? await this.minioService.generateImageUrl('client-documents', delivery.url)
              : '',
          };
        }),
      );

      allTransactions.push(...mappedDeliveries);
    }

    if (!params.type || params.type === 'out') {
      const transfersProvider = await this.transferProviderRepo.find({
        relations: ['provider'],
      });

      const filtered = transfersProvider.filter((transfer) => {
        const date = transfer.date;
        const matchesYear = params.year ? date.getFullYear().toString() === params.year : true;
        const matchesMonth = params.month
          ? (date.getMonth() + 1).toString() === params.month
          : true;
        const fullName =
          `${transfer.provider?.first_name || ''} ${transfer.provider?.last_name || ''}`.trim();
        const matchesName = params.name
          ? fullName.toLowerCase().includes(params.name.toLowerCase())
          : true;

        return matchesYear && matchesMonth && matchesName;
      });

      const mapped = await Promise.all(
        filtered.map(async (transfer) => ({
          id: transfer.transfer_id,
          name: `${transfer.provider?.first_name || ''} ${transfer.provider?.last_name || ''}`.trim(),
          type: 'out' as TransactionType,
          category: 'service' as TransactionCategory,
          date: transfer.date.toISOString().split('T')[0],
          invoiceUrl: transfer.url
            ? await this.minioService.generateImageUrl('client-documents', transfer.url)
            : '',
        })),
      );

      allTransactions.push(...mapped);
    }

    if (!params.type || params.type === 'out') {
      const transfers = await this.transferRepo.find({
        relations: ['delivery_person', 'delivery_person.user', 'delivery_person.user.clients'],
      });

      const filtered = transfers.filter((transfer) => {
        const date = transfer.date;
        const matchesYear = params.year ? date.getFullYear().toString() === params.year : true;
        const matchesMonth = params.month
          ? (date.getMonth() + 1).toString() === params.month
          : true;
        const fullName =
          `${transfer.delivery_person?.user.clients[0].first_name || ''} ${transfer.delivery_person?.user.clients[0].last_name || ''}`.trim();
        const matchesName = params.name
          ? fullName.toLowerCase().includes(params.name.toLowerCase())
          : true;

        return matchesYear && matchesMonth && matchesName;
      });

      const mapped = await Promise.all(
        filtered.map(async (transfer) => ({
          id: transfer.transfer_id,
          name: `${transfer.delivery_person?.user.clients[0].first_name || ''} ${transfer.delivery_person?.user.clients[0].last_name || ''}`.trim(),
          type: 'out' as TransactionType,
          category: 'delivery' as TransactionCategory,
          date: transfer.date.toISOString().split('T')[0],
          invoiceUrl: transfer.url
            ? await this.minioService.generateImageUrl('client-documents', transfer.url)
            : '',
        })),
      );

      allTransactions.push(...mapped);
    }

    if (!params.type || params.type === 'sub') {
      const subscriptions = await this.subscriptionTransactionRepo.find({
        relations: [
          'subscription',
          'subscription.user',
          'subscription.user.clients',
          'subscription.user.merchant',
        ],
      });

      const filtered = subscriptions.filter((subscription) => {
        const date = subscription.created_at;
        const matchesYear = params.year ? date.getFullYear().toString() === params.year : true;
        const matchesMonth = params.month
          ? (date.getMonth() + 1).toString() === params.month
          : true;

        let fullName = '';
        if (subscription.subscription?.user.clients.length > 0) {
          fullName =
            `${subscription.subscription.user.clients[0].first_name || ''} ${subscription.subscription.user.clients[0].last_name || ''}`.trim();
        } else if (subscription.subscription?.user.merchant) {
          fullName =
            `${subscription.subscription.user.merchant.first_name || ''} ${subscription.subscription.user.merchant.last_name || ''}`.trim();
        }

        const matchesName = params.name
          ? fullName.toLowerCase().includes(params.name.toLowerCase())
          : true;

        return matchesYear && matchesMonth && matchesName;
      });

      const mapped = await Promise.all(
        filtered.map(async (subscription) => {
          let name = '';
          if (subscription.subscription?.user.clients.length > 0) {
            name =
              `${subscription.subscription.user.clients[0].first_name || ''} ${subscription.subscription.user.clients[0].last_name || ''}`.trim();
          } else if (subscription.subscription?.user.merchant) {
            name =
              `${subscription.subscription.user.merchant.first_name || ''} ${subscription.subscription.user.merchant.last_name || ''}`.trim();
          }

          return {
            id: subscription.transaction_id,
            name,
            type: 'sub' as TransactionType,
            category: 'sub' as TransactionCategory,
            date: subscription.created_at.toISOString().split('T')[0],
            invoiceUrl: subscription.invoice_url
              ? await this.minioService.generateImageUrl(
                  'client-documents',
                  subscription.invoice_url,
                )
              : '',
          };
        }),
      );

      allTransactions.push(...mapped);
    }

    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allTransactions;
  }

  async getTransactions(params: {
    name?: string;
    type?: TransactionType;
    year?: string;
    month?: string;
    pageIndex: number;
    pageSize: number;
  }): Promise<{ data: Transaction[]; totalRows: number }> {
    const allTransactions = await this._fetchTransactions(params);

    const startIndex = params.pageIndex * params.pageSize;
    const paginatedData = allTransactions.slice(startIndex, startIndex + params.pageSize);

    return {
      data: paginatedData,
      totalRows: allTransactions.length,
    };
  }

  getCsvFile = async (
    res: any,
    params: {
      startMonth?: string;
      startYear?: string;
      endMonth?: string;
      endYear?: string;
      categories?: TransactionCategory[];
      name?: string;
      type?: TransactionType;
    },
  ): Promise<void> => {
    const allTransactions = await this._fetchTransactions({
      name: params.name,
      type: params.type,
      year: undefined,
      month: undefined,
    });

    let filtered = allTransactions;
    if (params.startYear || params.startMonth || params.endYear || params.endMonth) {
      filtered = filtered.filter((t) => {
        const date = new Date(t.date);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;

        const afterStart =
          !params.startYear ||
          year > +params.startYear ||
          (year === +params.startYear && (!params.startMonth || month >= +params.startMonth));

        const beforeEnd =
          !params.endYear ||
          year < +params.endYear ||
          (year === +params.endYear && (!params.endMonth || month <= +params.endMonth));

        return afterStart && beforeEnd;
      });
    }

    if (params.categories?.length) {
      filtered = filtered.filter((t) => params.categories!.includes(t.category));
    }

    const csvContent = [
      ['id', 'name', 'type', 'category', 'date', 'invoiceUrl'].join(','), // header
      ...filtered.map((t) => [t.id, t.name, t.type, t.category, t.date, t.invoiceUrl].join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=transactions.csv');
    res.send(csvContent);
  };

  async getStripeStats(period?: string): Promise<StripeStats> {
    (async () => {
      const now = Math.floor(Date.now() / 1000);
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60;

      try {
        await Promise.all([
          this.stripeService.getTotalRevenue(thirtyDaysAgo, now),
          this.stripeService.getCustomerStats(),
          this.stripeService.getActiveSubscribers(),
          this.stripeService.getPaymentStats(),
        ]);

        await this.stripeService.getTotalRevenue(thirtyDaysAgo - 30 * 24 * 60 * 60, thirtyDaysAgo);
      } catch (err) {
        console.warn('Background Stripe data fetch failed', err);
      }
    })();

    return {
      revenue: {
        total: 48250,
        previousPeriod: 42100,
        percentChange: 14.6,
        byPeriod: [
          { date: 'Jan', revenue: 4000, profit: 2400, margin: 60 },
          { date: 'Fév', revenue: 4500, profit: 2700, margin: 60 },
          { date: 'Mar', revenue: 5000, profit: 3000, margin: 60 },
          { date: 'Avr', revenue: 4800, profit: 2880, margin: 60 },
          { date: 'Mai', revenue: 5200, profit: 3120, margin: 60 },
          { date: 'Juin', revenue: 5800, profit: 3480, margin: 47 },
          { date: 'Juil', revenue: 6200, profit: 3720, margin: 52 },
          { date: 'Août', revenue: 6800, profit: 4080, margin: 60 },
          { date: 'Sep', revenue: 7200, profit: 4320, margin: 23 },
          { date: 'Oct', revenue: 7800, profit: 4680, margin: 60 },
          { date: 'Nov', revenue: 8200, profit: 4920, margin: 78 },
          { date: 'Déc', revenue: 8500, profit: 5100, margin: 60 },
        ],
      },
      customers: {
        total: 1248,
        new: 128,
        percentChange: 8.2,
        activeSubscribers: 876,
      },
      payments: {
        successRate: 96.7,
        averageValue: 87.5,
        refundRate: 2.3,
        byMethod: [
          { method: 'Carte de crédit', count: 850, value: 32500 },
          { method: 'Apple Pay', count: 320, value: 12800 },
          { method: 'Google Pay', count: 120, value: 4800 },
          { method: 'Virement bancaire', count: 45, value: 1800 },
        ],
      },
      transactions: [
        { method: 'CB', number: 850 },
        { method: 'Apple', number: 320 },
        { method: 'Google', number: 120 },
        { method: 'Cash', number: 30 },
        { method: 'Check', number: 15 },
      ],
    };
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const parcelStats = await this.getParcelSizeStats();
    const plans = await this.getSubscriptionRepartition();
    const subscriptionMonths = await this.getMonthlySubscriptionCount();
    const stats = await this.activityByDay();
    return {
      plan: plans,
      parcels: parcelStats,
      area: stats,
      subscription: subscriptionMonths,
    };
  }

  async getParcelSizeStats() {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const shipments = await this.shipmentsRepository.find({
      where: {
        deadline_date: MoreThanOrEqual(sixMonthsAgo),
      },
      relations: ['parcels'],
    });

    const sizeCounts = {
      S: 0,
      M: 0,
      L: 0,
      XL: 0,
      XXL: 0,
    };

    shipments.forEach((shipment) => {
      shipment.parcels.forEach((parcel) => {
        const weight = parcel.weight ?? 0;

        if (weight < 5) sizeCounts.S += 1;
        else if (weight <= 30) sizeCounts.M += 1;
        else if (weight <= 50) sizeCounts.L += 1;
        else if (weight <= 100) sizeCounts.XL += 1;
        else sizeCounts.XXL += 1;
      });
    });

    return Object.entries(sizeCounts)
      .filter(([_, nombre]) => nombre > 0)
      .map(([taille, nombre]) => ({
        taille: getLabelFromSize(taille),
        nombre,
      }));
  }

  async getSubscriptionRepartition() {
    const repartition = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoin('subscription.plan', 'plan')
      .select('plan.name', 'plan')
      .addSelect('COUNT(*)', 'number')
      .groupBy('plan.name')
      .orderBy('plan.name', 'ASC')
      .getRawMany();

    return repartition.map((row, index) => ({
      plan: row.plan,
      number: parseInt(row.number, 10),
      colorIndex: index + 1,
    }));
  }

  async getMonthlySubscriptionCount() {
    const today = new Date();
    const months: { key: string; label: string; count: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const date = subMonths(today, i);
      const key = format(date, 'yyyy-MM');
      months.push({ key, label: format(date, 'MMMM', { locale: fr }), count: 0 });
    }

    const rawData = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select("TO_CHAR(subscription.start_date, 'YYYY-MM')", 'month')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.start_date >= :fromDate', {
        fromDate: startOfMonth(subMonths(today, 5)),
      })
      .andWhere('subscription.start_date < :toDate', { toDate: startOfMonth(subMonths(today, -1)) })
      .groupBy('month')
      .orderBy('month', 'ASC')
      .getRawMany();

    return months.map((month) => {
      const found = rawData.find((row) => row.month === month.key);
      return {
        month: month.label.charAt(0).toUpperCase() + month.label.slice(1),
        subscription: found ? parseInt(found.count, 10) : 0,
      };
    });
  }

  async activityByDay(): Promise<{ date: string; provider: number; delivery: number }[]> {
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 30);

    const appointments = await this.appointmentsRepo
      .createQueryBuilder('appointment')
      .select([
        "DATE_TRUNC('day', appointment.service_date) as day",
        'COUNT(DISTINCT appointment.provider_id) as provider_count',
        'COUNT(appointment.appointment_id) as appointment_count',
      ])
      .where('appointment.service_date BETWEEN :start AND :end', { start: startDate, end: today })
      .groupBy('day')
      .orderBy('day')
      .getRawMany();

    const deliveries = await this.deliveryRepository
      .createQueryBuilder('delivery')
      .select([
        "DATE_TRUNC('day', delivery.send_date) as day",
        'COUNT(DISTINCT delivery.delivery_person_id) as delivery_person_count',
        'COUNT(delivery.delivery_id) as delivery_count',
      ])
      .where('delivery.send_date BETWEEN :start AND :end', { start: startDate, end: today })
      .groupBy('day')
      .orderBy('day')
      .getRawMany();

    const appointmentsMap = new Map<string, number>();
    for (const a of appointments) {
      const day = formatISO(new Date(a.day), { representation: 'date' });
      appointmentsMap.set(day, Number(a.provider_count));
    }

    const deliveriesMap = new Map<string, number>();
    for (const d of deliveries) {
      const day = formatISO(new Date(d.day), { representation: 'date' });
      deliveriesMap.set(day, Number(d.delivery_count));
    }

    const results: { date: string; provider: number; delivery: number }[] = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const dayStr = formatISO(d, { representation: 'date' });

      results.push({
        date: dayStr,
        provider: appointmentsMap.get(dayStr) ?? 0,
        delivery: deliveriesMap.get(dayStr) ?? 0,
      });
    }

    return results;
  }
}

function getLabelFromSize(size: string): string {
  switch (size) {
    case 'S':
      return 'Petit colis (S)';
    case 'M':
      return 'Moyen colis (M)';
    case 'L':
      return 'Grand colis (L)';
    case 'XL':
      return 'Très grand colis (XL)';
    case 'XXL':
      return 'Colis XXL';
    default:
      return 'Inconnu';
  }
}
