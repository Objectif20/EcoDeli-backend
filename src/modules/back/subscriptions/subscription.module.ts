import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Plan } from 'src/common/entities/plan.entity';
import { SubscriptionService } from './subscription.service';
import { SubscriptionController } from './subscription.controller';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { Merchant } from 'src/common/entities/merchant.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Subscription, Plan, Merchant]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [SubscriptionService, JwtService],
    controllers: [SubscriptionController],
    exports: [TypeOrmModule, JwtModule],
})
export class SubscriptionModule { }