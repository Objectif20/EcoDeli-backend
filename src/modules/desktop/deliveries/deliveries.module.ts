import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { DeliveriesService } from './deliveries.service';
import { DeliveriesController } from './deliveries.controller';
import { Delivery } from 'src/common/entities/delivery.entity';
import { Users } from 'src/common/entities/user.entity';


@Module({
    imports: [
        TypeOrmModule.forFeature([Delivery, Users]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [DeliveriesService],
    controllers: [DeliveriesController],
    exports: [TypeOrmModule, JwtModule],
})
export class DeliveriesModule { }