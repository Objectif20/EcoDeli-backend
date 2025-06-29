import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Merchant } from 'src/common/entities/merchant.entity';
import { MerchantService } from './merchant.service';
import { MerchantController } from './merchant.controller';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { Shipment } from 'src/common/entities/shipment.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Report } from 'src/common/entities/report.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Merchant, Shipment, Subscription, Report]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [MerchantService],
    controllers: [MerchantController],
    exports: [TypeOrmModule, JwtModule],
})
export class MerchantModule { }