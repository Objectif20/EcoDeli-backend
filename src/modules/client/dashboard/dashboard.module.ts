import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Delivery } from 'src/common/entities/delivery.entity';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Users } from 'src/common/entities/user.entity';
import { Shipment } from 'src/common/entities/shipment.entity';


@Module({
    imports: [
        TypeOrmModule.forFeature([Delivery, DeliveryPerson, Users, Shipment]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [DashboardService],
    controllers: [DashboardController],
})
export class DashboardModule {}
