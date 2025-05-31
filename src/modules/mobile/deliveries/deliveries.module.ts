import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";

import { SharedModule } from "src/common/shared/shared.module";
import { DeliveriesController } from "./deliveries.controller";
import { DeliveriesService } from "./deliveries.service";
import { Users } from "src/common/entities/user.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import { DeliveryTransfer } from "src/common/entities/delivery_transfer.entity";
import { Subscription } from "src/common/entities/subscription.entity";



@Module({
    imports: [
        TypeOrmModule.forFeature([Users, Shipment, Delivery, DeliveryTransfer, Subscription]),
        JwtModule.register({}),
        SharedModule,
    ],
    controllers: [DeliveriesController],
    providers: [JwtService,DeliveriesService],
    exports: [TypeOrmModule,DeliveriesService],


})
export class DeliveriesModule {}