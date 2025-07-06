import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inject } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Readable } from 'stream';
import { Subscription } from 'src/common/entities/subscription.entity';
import { SubscriptionTransaction } from 'src/common/entities/subscription_transaction.entity';
import { Users } from 'src/common/entities/user.entity';
import { PdfService } from 'src/common/services/pdf/pdf.service';
import { MinioService } from 'src/common/services/file/minio.service';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionTransaction)
    private readonly subscriptionTransactionRepository: Repository<SubscriptionTransaction>,
    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
    private readonly pdfService: PdfService,
    private readonly minioService: MinioService,
    @Inject('NodeMailer') private readonly mailer: nodemailer.Transporter,
  ) {}

  async generateMonthlyInvoices(): Promise<void> {
    const today = new Date();
    const currentDay = today.getDate();

    const subscriptionsToProcess = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .leftJoinAndSelect('subscription.plan', 'plan')
      .leftJoinAndSelect('user.clients', 'clients')
      .leftJoinAndSelect('user.merchant', 'merchant')
      .where('subscription.status = :status', { status: 'active' })
      .andWhere('plan.price > 0')
      .andWhere('EXTRACT(DAY FROM subscription.start_date) = :day', { day: currentDay })
      .andWhere('subscription.start_date <= :today', { today })
      .andWhere('subscription.end_date > :today', { today })
      .getMany();

    for (const subscription of subscriptionsToProcess) {
      try {
        await this.processSubscriptionInvoice(subscription);
      } catch (error) {}
    }
  }

  private async processSubscriptionInvoice(subscription: Subscription): Promise<void> {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const existingTransaction = await this.subscriptionTransactionRepository.findOne({
      where: {
        subscription: { subscription_id: subscription.subscription_id },
        month,
        year,
      },
    });

    if (existingTransaction) {
      return;
    }

    const invoiceData = this.prepareInvoiceData(subscription, month, year);
    const pdfBuffer = await this.pdfService.generateBilling(invoiceData);

    const fileName = `facture_${subscription.subscription_id}_${year}_${month.toString().padStart(2, '0')}.pdf`;
    const filePath = `subscriptions/${subscription.subscription_id}/invoices/${year}/${fileName}`;

    const file: Express.Multer.File = {
      fieldname: 'file',
      originalname: fileName,
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: pdfBuffer,
      size: pdfBuffer.length,
      destination: '',
      filename: fileName,
      path: '',
      stream: Readable.from(pdfBuffer),
    };

    await this.minioService.uploadFileToBucket('client-documents', filePath, file);

    const transaction = this.subscriptionTransactionRepository.create({
      subscription,
      month,
      year,
      price_at_transaction: subscription.plan.price,
      invoice_url: filePath,
    });

    await this.subscriptionTransactionRepository.save(transaction);

    await this.sendInvoiceEmail(subscription, pdfBuffer, fileName);
  }

  private prepareInvoiceData(subscription: Subscription, month: number, year: number): any {
    const user = subscription.user;
    const plan = subscription.plan;

    let customerInfo = {
      name: '',
      email: user.email,
      address: '',
    };

    if (user.clients && user.clients.length > 0) {
      const client = user.clients[0];
      customerInfo.name = `${client.first_name} ${client.last_name}`;
    } else if (user.merchant) {
      customerInfo.name = user.merchant.company_name;
      customerInfo.address = `${user.merchant.address}, ${user.merchant.postal_code} ${user.merchant.city}, ${user.merchant.country}`;
    }

    const monthNames = [
      'Janvier',
      'Février',
      'Mars',
      'Avril',
      'Mai',
      'Juin',
      'Juillet',
      'Août',
      'Septembre',
      'Octobre',
      'Novembre',
      'Décembre',
    ];

    return {
      invoiceNumber: `${year}-${month.toString().padStart(2, '0')}-${subscription.subscription_id.slice(-8)}`,
      invoiceDate: new Date(),
      periodLabel: `${monthNames[month - 1]} ${year}`,
      customer: customerInfo,
      plan: {
        name: plan.name,
        price: plan.price,
        description: `Abonnement ${plan.name}`,
      },
      subscription: {
        id: subscription.subscription_id,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
      },
    };
  }

  private async sendInvoiceEmail(
    subscription: Subscription,
    pdfBuffer: Buffer,
    fileName: string,
  ): Promise<void> {
    const user = subscription.user;

    let customerName = '';
    if (user.clients && user.clients.length > 0) {
      customerName = `${user.clients[0].first_name} ${user.clients[0].last_name}`;
    } else if (user.merchant) {
      customerName = user.merchant.company_name;
    }

    const monthNames = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ];

    const now = new Date();
    const monthName = monthNames[now.getMonth()];
    const year = now.getFullYear();

    try {
      const fromEmail = this.mailer.options.auth.user;
      await this.mailer.sendMail({
        from: fromEmail,
        to: user.email,
        subject: `Facture ${subscription.plan.name} - ${monthName} ${year}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Facture mensuelle</h2>
            <p>Bonjour ${customerName},</p>
            <p>Veuillez trouver ci-joint votre facture pour l'abonnement <strong>${subscription.plan.name}</strong> du mois de ${monthName} ${year}.</p>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #333;">Détails de la facture</h3>
              <p style="margin: 5px 0;"><strong>Plan:</strong> ${subscription.plan.name}</p>
              <p style="margin: 5px 0;"><strong>Période:</strong> ${monthName} ${year}</p>
              <p style="margin: 5px 0;"><strong>Montant:</strong> ${subscription.plan.price}€</p>
            </div>
            <p>Merci pour votre confiance.</p>
            <p>L'équipe</p>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: pdfBuffer,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (error) {
      throw error;
    }
  }

  async generateInvoiceForSubscription(subscriptionId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { subscription_id: subscriptionId },
      relations: ['user', 'plan', 'user.clients', 'user.merchant'],
    });

    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (
      !subscription.plan ||
      subscription.plan.price === undefined ||
      subscription.plan.price <= 0
    ) {
      throw new Error(`Cannot generate invoice for free plan`);
    }

    await this.processSubscriptionInvoice(subscription);
  }
}
