import { Injectable, Logger } from '@nestjs/common';
import { StripeService } from 'src/common/services/stripe/stripe.service';
import Stripe from 'stripe';

@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(private readonly stripeService: StripeService) {}

  async handleEvent(event: Stripe.Event) {
    this.logger.log(`📦 Reçu l'événement Stripe : ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        return this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      case 'invoice.payment_succeeded':
        return this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      case 'customer.subscription.deleted':
        return this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      case 'payment_intent.succeeded':
        return this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      case 'charge.succeeded':
        return this.handleChargeSucceeded(event.data.object as Stripe.Charge);
      case 'customer.created':
        return this.handleCustomerCreated(event.data.object as Stripe.Customer);
      case 'invoice.payment_failed':
        return this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      case 'customer.subscription.created':
        return this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      case 'charge.dispute.created':
        return this.handleDisputeCreated(event.data.object as Stripe.Dispute);
      case 'payout.paid':
        return this.handlePayoutPaid(event.data.object as Stripe.Payout);
      case 'customer.subscription.updated':
        return this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      case 'payment_method.attached':
        return this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
      case 'transfer.created':
        return this.handleTransferCreated(event.data.object as Stripe.Transfer);
      case 'payout.created':
        return this.handlePayoutCreated(event.data.object as Stripe.Payout);
      case 'invoice.created':
        return this.handleInvoiceCreated(event.data.object as Stripe.Invoice);
      case 'customer.updated':
        return this.handleCustomerUpdated(event.data.object as Stripe.Customer);
      case 'refund.created':
        return this.handleRefundCreated(event.data.object as Stripe.Refund);
      case 'setup_intent.succeeded':
        return this.handleSetupIntentSucceeded(event.data.object as Stripe.SetupIntent);
      case 'balance.available':
        return this.handleBalanceAvailable(event.data.object as Stripe.Balance);
      case 'plan.created':
        return this.handlePlanCreated(event.data.object as Stripe.Plan);
      default:
        this.logger.warn(`⚠️ Événement Stripe non géré : ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    this.logger.log(`✅ Paiement complété pour ${session.id} - client ${session.customer}`);
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
    this.logger.log(`💸 Paiement réussi pour facture ${invoice.id} - montant ${invoice.amount_paid}`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    this.logger.log(`❌ Abonnement annulé pour ${subscription.id}`);
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`💳 Paiement réussi pour l'intention de paiement ${paymentIntent.id}`);
  }

  private async handleChargeSucceeded(charge: Stripe.Charge) {
    this.logger.log(`💰 Charge réussie pour ${charge.id}`);
  }

  private async handleCustomerCreated(customer: Stripe.Customer) {
    this.logger.log(`👤 Nouveau client créé : ${customer.id}`);
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    this.logger.warn(`❌ Échec du paiement pour la facture ${invoice.id}`);
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    this.logger.log(`🆕 Nouvel abonnement créé : ${subscription.id}`);
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    this.logger.warn(`⚠️ Litige créé pour la charge ${dispute.charge}`);
  }

  private async handlePayoutPaid(payout: Stripe.Payout) {
    this.logger.log(`💵 Paiement effectué : ${payout.id}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    this.logger.log(`🔄 Abonnement mis à jour : ${subscription.id}`);
  }

  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
    this.logger.log(`💳 Méthode de paiement attachée : ${paymentMethod.id}`);
  }

  private async handleTransferCreated(transfer: Stripe.Transfer) {
    this.logger.log(`🔄 Virement créé : ${transfer.id}`);
  }

  private async handlePayoutCreated(payout: Stripe.Payout) {
    this.logger.log(`💵 Paiement créé : ${payout.id}`);
  }

  private async handleInvoiceCreated(invoice: Stripe.Invoice) {
    this.logger.log(`📄 Facture créée : ${invoice.id}`);
  }

  private async handleCustomerUpdated(customer: Stripe.Customer) {
    this.logger.log(`👤 Client mis à jour : ${customer.id}`);
  }

  private async handleRefundCreated(refund: Stripe.Refund) {
    this.logger.log(`💸 Remboursement créé : ${refund.id}`);
  }

  private async handleSetupIntentSucceeded(setupIntent: Stripe.SetupIntent) {
    this.logger.log(`⚙️ Intention de configuration réussie : ${setupIntent.id}`);
  }

  private async handleBalanceAvailable(balance: Stripe.Balance) {
    this.logger.log(`💰 Solde disponible mis à jour`);
  }

  private async handlePlanCreated(plan: Stripe.Plan) {
    this.logger.log(`📈 Nouveau plan créé : ${plan.id}`);
  }
}
