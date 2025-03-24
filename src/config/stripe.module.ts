import { Module, Global } from '@nestjs/common';
import { StripeConfigService } from './stripe.config';
import { SecretsModule } from './secrets.module';

@Global()
@Module({
  imports: [SecretsModule],
  providers: [
    StripeConfigService,
    {
      provide: 'STRIPE_CLIENT',
      useFactory: async (stripeConfigService: StripeConfigService) => {
        return stripeConfigService.createStripeClient();
      },
      inject: [StripeConfigService],
    },
  ],
  exports: ['STRIPE_CLIENT'],
})
export class StripeModule {}
