import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";
import { Users } from "src/common/entities/user.entity";
import { Client } from "src/common/entities/client.entity";
import { Providers } from "src/common/entities/provider.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { ClientProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { Subscription } from "src/common/entities/subscription.entity";
import { Plan } from "src/common/entities/plan.entity";
import { SharedModule } from "src/common/shared/shared.module";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { Blocked } from "src/common/entities/blocked.entity";
import { Report } from "src/common/entities/report.entity";
import { Availability } from "src/common/entities/availibities.entity";
import { OneSignalDevice } from "src/common/entities/onesignal-device.entity";
import { Transfer } from "src/common/entities/transfers.entity";
import { TransferProvider } from "src/common/entities/transfers_provider.entity";
import { SubscriptionTransaction } from "src/common/entities/subscription_transaction.entity";
import { Languages } from "src/common/entities/languages.entity";


@Module({

    imports: [
        TypeOrmModule.forFeature([Users, Client, Providers, DeliveryPerson, Merchant, Subscription, Plan, ProviderDocuments,Languages, Blocked, Report, Availability, OneSignalDevice, Transfer, TransferProvider, SubscriptionTransaction, Subscription]),
        JwtModule.register({}),
        SharedModule,
    ],
    controllers: [ClientProfileController],
    providers: [JwtService, ClientProfileController, ProfileService],
    exports: [TypeOrmModule, ProfileService],


})
export class ProfileModule {}