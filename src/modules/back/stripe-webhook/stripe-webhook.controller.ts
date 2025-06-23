import {
  Controller,
  Post,
  Headers,
  Req,
  Res,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import Stripe from 'stripe';
import { StripeWebhookService } from './stripe-webhook.service';

@Controller('webhooks')
export class StripeWebhookController {
  constructor(
    private readonly stripeWebhookService: StripeWebhookService,
    @Inject('STRIPE_CLIENT') private readonly stripeClient: Stripe,
  ) {}

  @Post('stripe')
  async handleWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('stripe-signature') signature: string,
  ) {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET is not defined in environment variables.');
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Stripe webhook secret is not configured.');
    }

    let event: Stripe.Event;

    try {
      event = this.stripeClient.webhooks.constructEvent(
        req.body,
        signature,
        endpointSecret,
      );
    } catch (err) {
      console.error('❌ Erreur de vérification de signature Stripe :', err.message);
      return res.status(HttpStatus.BAD_REQUEST).send(`Webhook Error: ${err.message}`);
    }

    try {
      await this.stripeWebhookService.handleEvent(event);
    } catch (err) {
      console.error('❌ Erreur lors du traitement du webhook Stripe :', err.message);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Erreur webhook Stripe');
    }

    return res.status(HttpStatus.OK).json({ received: true });
  }
}
