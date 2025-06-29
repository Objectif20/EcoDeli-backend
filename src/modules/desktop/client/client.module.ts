import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { Shipment } from 'src/common/entities/shipment.entity';
import { Subscription } from 'src/common/entities/subscription.entity';
import { Report } from 'src/common/entities/report.entity';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';
import { Client } from 'src/common/entities/client.entity';
import { Appointments } from 'src/common/entities/appointments.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Shipment, Subscription, Report, Client, Appointments]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [ClientService],
    controllers: [ClientController],
    exports: [TypeOrmModule, JwtModule],
})
export class ClientModule { }