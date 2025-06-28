import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';

import { JwtService } from 'src/config/jwt.service';
import { SharedModule } from 'src/common/shared/shared.module';
import { StripeWebhookService } from './stripe-webhook.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    JwtModule.register({}),
    SharedModule
  ],
  providers: [StripeWebhookService, JwtService], 
  controllers: [StripeWebhookController], 
  exports: [StripeWebhookService, TypeOrmModule, JwtModule],
})
export class StripeWebhookModule {}
