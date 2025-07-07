import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingService } from './billing-service';

@Injectable()
export class BillingCronService {
  private readonly logger = new Logger(BillingCronService.name);
  constructor(private readonly billingService: BillingService) {}

  @Cron('0 9 * * *', {
    name: 'daily-subscription-check',
    timeZone: 'Europe/Paris',
  })
  async handleDailySubscriptionCheck(): Promise<void> {
    
    try {
      await this.billingService.generateMonthlyInvoices();
    } catch (error) {
    }
  }
}