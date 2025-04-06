import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";
import { Users } from "src/common/entities/user.entity";
import { Client } from "src/common/entities/client.entity";
import { Providers } from "src/common/entities/provider.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { RegisterService } from "./register.service";
import { RegisterController } from "./register.controller";
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


@Module({

    imports: [
        TypeOrmModule.forFeature([Users, Client, Providers, DeliveryPerson, Merchant, Languages, Themes, Plan, Subscription, Merchant, ProviderContracts, ProviderDocuments, DeliveryPerson, DeliveryPersonDocument, VehicleDocument, Vehicle, Category]),
        JwtModule.register({}),
        SharedModule
    ],
    controllers: [RegisterController],
    providers: [RegisterController, JwtService, RegisterService],
    exports: [TypeOrmModule, RegisterService],

})
export class RegisterModule {}