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
import { Parcel } from "src/common/entities/parcels.entity";
import { ParcelImage } from "src/common/entities/parcel_images.entity";
import { Favorite } from "src/common/entities/favorites.entity";
import { Store } from "src/common/entities/stores.entity";
import { Warehouse } from "src/common/entities/warehouses.entity";
import { ExchangePoint } from "src/common/entities/exchange_points.entity";
import { DeliveryCommission } from "src/common/entities/delivery_commission.entity";
import { DeliveryReview } from "src/common/entities/delivery_reviews.entity";
import { DeliveryReviewResponse } from "src/common/entities/delivery_review_responses.entity";


@Module({

    imports: [
        TypeOrmModule.forFeature([Users, Client, DeliveryPerson, Merchant, Plan, Subscription, Merchant, 
            ProviderContracts, ProviderDocuments, DeliveryPerson, DeliveryPersonDocument, Category, Delivery,
            Shipment, Keyword, DeliveryKeyword, Parcel, ParcelImage, Favorite, Store, ExchangePoint, Warehouse, DeliveryCommission, DeliveryReview, DeliveryReviewResponse]),
        JwtModule.register({}),
        SharedModule
    ],
    controllers: [DeliveryController],
    providers: [DeliveryController, JwtService, DeliveryService],
    exports: [TypeOrmModule, DeliveryService],

})
export class DeliveryModule {}