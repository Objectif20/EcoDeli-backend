import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";

import { SharedModule } from "src/common/shared/shared.module";
import { Users } from "src/common/entities/user.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import { ShipmentsService } from "./shipments.service";
import { ShipmentsController } from "./shipments.controller";
import { Parcel } from "src/common/entities/parcels.entity";



@Module({
    imports: [
        TypeOrmModule.forFeature([Users, Shipment, Delivery, Parcel]),
        JwtModule.register({}),
        SharedModule,
    ],
    controllers: [ShipmentsController],
    providers: [JwtService,ShipmentsService],
    exports: [TypeOrmModule,ShipmentsService],


})
export class ShipmentsModule {}