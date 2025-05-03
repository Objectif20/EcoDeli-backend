

import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";
import { Users } from "src/common/entities/user.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { SharedModule } from "src/common/shared/shared.module";
import { DeliveryManController } from "./deliveryman.controller";
import { DeliveryManService } from "./deliveryman.service";
import { Trip } from "src/common/entities/trips.entity";
import { Category } from "src/common/entities/category.entity";
import { Vehicle } from "src/common/entities/vehicle.entity";
import { VehicleDocument } from "src/common/entities/vehicle_documents.entity";
import { Shipment } from "src/common/entities/shipment.entity";


@Module({

    imports: [
        TypeOrmModule.forFeature([Users, DeliveryPerson, Trip, Category, Vehicle, VehicleDocument, Shipment]),
        JwtModule.register({}),
        SharedModule,
    ],
    controllers: [DeliveryManController],
    providers: [JwtService, DeliveryManController, DeliveryManService],
    exports: [TypeOrmModule, DeliveryManService],


})
export class DeliverymanModule {}