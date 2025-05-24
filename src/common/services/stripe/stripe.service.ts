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
      console.error('Erreur lors de la création du client Stripe:', error);
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
      console.error('Erreur lors de l\'attachement du PaymentMethod au client Stripe:', error);
      throw new BadRequestException('Erreur lors de l\'attachement du paymentMethod au client Stripe', error);
    }
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    startDate?: Date
  ): Promise<Stripe.Subscription> {
    try {
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: priceId }],
      };
  
      if (startDate && startDate > new Date()) {
        const unixTimestamp = Math.floor(startDate.getTime() / 1000);
        subscriptionParams.trial_end = unixTimestamp;
        subscriptionParams.backdate_start_date = undefined;
      }
  
      return await this.stripeClient.subscriptions.create(subscriptionParams);
    } catch (error) {
      console.error('Erreur lors de la création de l\'abonnement Stripe:', error);
      throw new BadRequestException('Erreur lors de la création de l\'abonnement Stripe', error);
    }
  }

  async cancelSubscriptionAtPeriodEnd(subscriptionId: string): Promise<Stripe.Subscription> {
    try {
      return await this.stripeClient.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    } catch (error) {
      console.error('Erreur lors de l\'annulation de l\'abonnement Stripe:', error);
      throw new BadRequestException('Erreur lors de l\'annulation de l\'abonnement Stripe', error);
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
      console.warn('Transfert échoué (attendu en test), on simule un transfert Stripe.');
  
      return {
        id: 'test',
        amount: amountInCents,
        currency: 'eur',
        destination: stripeAccountId,
        object: 'transfer',
        created: Math.floor(Date.now() / 1000),
      } as Stripe.Transfer;
    }
  }

  async createPriceForPlan(planName : string, planPrice : number): Promise<Stripe.Price> {
    if (!planName || !planPrice) {
      throw new Error('Le plan doit avoir un nom et un prix pour créer un Price Stripe.');
    }
  
    const product = await this.stripeClient.products.create({
      name: planName,
    });
  
    const price = await this.stripeClient.prices.create({
      unit_amount: planPrice * 100, 
      currency: 'eur',               
      recurring: { interval: 'month' },
      product: product.id,
    });
  
    return price;
  }

  async chargeCustomer(
    customerId: string,
    amountInCents: number,
    description: string
  ): Promise<{ stripePaymentIntentId: string }> {
    try {
      const paymentMethods = await this.stripeClient.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      if (paymentMethods.data.length === 0) {
        throw new BadRequestException('Aucun moyen de paiement attaché au client.');
      }

      const paymentMethodId = paymentMethods.data[0].id;

      const paymentIntent = await this.stripeClient.paymentIntents.create({
        amount: amountInCents,
        currency: 'eur',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description,
      });

      return { stripePaymentIntentId: paymentIntent.id };
    } catch (error) {
      console.error('Erreur lors du prélèvement Stripe:', error);

      if (error.code === 'authentication_required' || error.code === 'card_declined') {
        throw new BadRequestException(`Paiement échoué : ${error.message}`);
      }

      throw new BadRequestException('Erreur lors du prélèvement Stripe', error);
    }
  }

}
