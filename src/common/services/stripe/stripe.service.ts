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

  async createConnectedAccountWithToken(accountToken: string): Promise<Stripe.Account> {
    console.log('Creating connected account with token:', accountToken);
    try {
      const account = await this.stripeClient.accounts.create({
        type: 'custom',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        account_token: accountToken,
        country: 'FR',
      });

      console.log('Compte Stripe créé avec succès:', account);
      return account;
    } catch (error) {
      console.error('Erreur lors de la création du compte Stripe:', error);

      if (error.response) {
        console.error('Détails de l\'erreur Stripe:', error.response.data);
      }

      throw new BadRequestException(
        'Erreur lors de la création du compte Stripe Connect',
        error
      );
    }
  }

  async createExpressAccount(): Promise<Stripe.Account> {
    try {
      const account = await this.stripeClient.accounts.create({
        type: 'express',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        country: 'FR',
      });

      console.log('Compte Stripe Express créé avec succès:', account);
      return account;
    } catch (error) {
      console.error('Erreur lors de la création du compte Stripe Express:', error);
      throw new BadRequestException(
        'Erreur lors de la création du compte Stripe Express',
        error
      );
    }
  }

  async createSetupIntentForConnectedAccount(stripeAccountId: string): Promise<Stripe.SetupIntent> {
    try {
      const setupIntent = await this.stripeClient.setupIntents.create(
        {
          payment_method_types: ['sepa_debit'],
          usage: 'off_session',
        },
        {
          stripeAccount: stripeAccountId,
        }
      );

      return setupIntent;
    } catch (error) {
      throw new BadRequestException('Erreur lors de la création du SetupIntent Stripe', error);
    }
  }

  async createAccountLink(stripeAccountId: string): Promise<string> {
    try {
      const accountLink = await this.stripeClient.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://example.com/reauth',
        return_url: 'https://ecodeli.remythibaut.fr/office/billing-settings',
        type: 'account_onboarding',
      });

      const accountLinkUrl = accountLink.url;
      console.log('URL pour le formulaire de validation du profil:', accountLinkUrl);
      return accountLinkUrl;
    } catch (error) {
      console.error('Erreur lors de la création du lien du compte Stripe:', error);
      throw new BadRequestException('Erreur lors de la création du lien du compte Stripe', error);
    }
  }

  async updateExpressAccount(stripeAccountId: string): Promise<string> {
    try {
      const accountLink = await this.stripeClient.accountLinks.create({
        account: stripeAccountId,
        refresh_url: 'https://example.com/reauth',
        return_url: 'https://ecodeli.remythibaut.fr/office/billing-settings',
        type: 'account_onboarding',
      });

      const accountLinkUrl = accountLink.url;
      console.log('URL pour la mise à jour du profil:', accountLinkUrl);
      return accountLinkUrl;
    } catch (error) {
      console.error('Erreur lors de la mise à jour du compte Stripe:', error);
      throw new BadRequestException('Erreur lors de la mise à jour du compte Stripe', error);
    }
  }

  async isStripeAccountValid(stripeAccountId: string): Promise<{
    valid: boolean;
    enabled: boolean;
    needsIdCard: boolean;
    urlComplete?: string;
  }> {
    try {
      const account = await this.stripeClient.accounts.retrieve(stripeAccountId);
      const isValid = account.details_submitted && account.charges_enabled;
      const isEnabled = account.charges_enabled && account.payouts_enabled;
      const needsIdCard = !!account.requirements?.currently_due?.some((item: string) =>
        item.includes("verification.document")
      );

      const urlComplete = !isEnabled
        ? await this.createAccountLink(stripeAccountId)
        : undefined;

      return { valid: isValid, enabled: isEnabled, needsIdCard, urlComplete };
    } catch (error) {
      console.error("Erreur lors de la récupération du compte Stripe :", error);
      return { valid: false, enabled: false, needsIdCard: false };
    }
  }

  async getStripeExpressAccountStatus(stripeAccountId: string): Promise<{
    isValid: boolean;
    isEnabled: boolean;
    needsIdCard: boolean;
  }> {
    try {
      const account = await this.stripeClient.accounts.retrieve(stripeAccountId);
  
      const isValid = account.details_submitted === true;
      const isEnabled = account.charges_enabled && account.payouts_enabled;
  
      const needsIdCard = account.requirements?.currently_due?.some((item: string) =>
        item.includes("verification.document")
      ) ?? false;
  
      return { isValid, isEnabled, needsIdCard };
    } catch (error) {
      console.error("Erreur lors de la récupération du compte Stripe Express :", error);
      return { isValid: false, isEnabled: false, needsIdCard: false };
    }
  }

  async transferToConnectedAccount(stripeAccountId: string, amountInCents: number): Promise<Stripe.Transfer> {
    try {
      const transfer = await this.stripeClient.transfers.create({
        amount: amountInCents,
        currency: 'eur',
        destination: stripeAccountId,
      });
  
      console.log('Transfert effectué avec succès :', transfer);
      return transfer;
    } catch (error) {
      console.error('Erreur lors du transfert vers le compte connecté Stripe:', error);
      throw new BadRequestException('Erreur lors du transfert vers le compte connecté Stripe', error);
    }
  }
}
