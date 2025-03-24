import { Injectable } from '@nestjs/common';
import { SecretsService } from '../common/services/secrets.service';
import { Stripe } from 'stripe';

@Injectable()
export class StripeConfigService {
  private stripeClient: Stripe;

  constructor(private secretsService: SecretsService) {}

  async createStripeClient(): Promise<Stripe> {
    const stripeSecretKey = await this.secretsService.loadSecret('STRIPE_SK_SECRET');
    if (!stripeSecretKey) {
      throw new Error('La clé Stripe n\'est pas définie');
    }

    this.stripeClient = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
      typescript: true,
    });

    return this.stripeClient;
  }

  getClient(): Stripe {
    return this.stripeClient;
  }
}
