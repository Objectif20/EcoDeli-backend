import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";
import { Users } from "src/common/entities/user.entity";
import { Client } from "src/common/entities/client.entity";
import { Providers } from "src/common/entities/provider.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { DeliveryService } from "./delivery.service";
import { DeliveryController } from "./delivery.controller";
import { Languages } from "src/common/entities/languages.entity";
import { Themes } from "src/common/entities/theme.entity";
import { Plan } from "src/common/entities/plan.entity";
import { Subscription } from "src/common/entities/subscription.entity";
import { SharedModule } from "src/common/shared/shared.module";
import { ProviderContracts } from "src/common/entities/providers_contracts.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { DeliveryPersonDocument } from "src/common/entities/delivery_person_documents.entity";
import { VehicleDocument } from "src/common/entities/vehicle_documents.entity";
import { Vehicle } from "src/common/entities/vehicle.entity";
import { Category } from "src/common/entities/category.entity";
import { Delivery } from "src/common/entities/delivery.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { Keyword } from "src/common/entities/keywords.entity";
import { DeliveryKeyword } from "src/common/entities/delivery_keywords.entity";


@Module({

    imports: [
        TypeOrmModule.forFeature([Users, Client, DeliveryPerson, Merchant, Plan, Subscription, Merchant, 
            ProviderContracts, ProviderDocuments, DeliveryPerson, DeliveryPersonDocument, Category, Delivery,
            Shipment, Keyword, DeliveryKeyword]),
        JwtModule.register({}),
        SharedModule
    ],
    controllers: [DeliveryController],
    providers: [DeliveryController, JwtService, DeliveryService],
    exports: [TypeOrmModule, DeliveryService],

})
export class DeliveryModule {}