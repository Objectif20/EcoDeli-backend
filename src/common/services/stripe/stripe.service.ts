import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripeClient: Stripe;

  constructor(@Inject('STRIPE_CLIENT') stripeClient: Stripe) {
    this.stripeClient = stripeClient;
  }

  async createCustomer(email: string, description: string): Promise<Stripe.Customer> {
    try {
      return await this.stripeClient.customers.create({
        email,
        description,
      });
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création du client Stripe', error);
    }
  }

  async attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
    try {
      const paymentMethods = await this.stripeClient.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      const isAttached = paymentMethods.data.some(pm => pm.id === paymentMethodId);
      if (isAttached) {
        throw new BadRequestException('Le PaymentMethod est déjà attaché à un autre client.');
      }

      await this.stripeClient.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await this.stripeClient.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    } catch (error) {
      throw new BadRequestException('Erreur lors de l\'attachement du paymentMethod au client Stripe', error);
    }
  }

  async createSubscription(customerId: string, priceId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripeClient.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
      });
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création de l\'abonnement Stripe', error);
    }
  }

  async createConnectedAccountWithIban(email: string, country: string, paymentMethodId: string): Promise<Stripe.Account> {
    try {
      const account = await this.stripeClient.accounts.create({
        type: 'custom',
        country: country,
        email: email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        tos_acceptance: { date: Math.floor(Date.now() / 1000), ip: '127.0.0.1' },
      });

      await this.stripeClient.paymentMethods.attach(paymentMethodId, {
        customer: account.id,
      });

      return account;
    } catch (error) {
      throw new BadRequestException("Erreur lors de la création du compte Stripe Connect avec IBAN", error);
    }
  }
}
