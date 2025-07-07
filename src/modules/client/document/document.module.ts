import { Module } from "@nestjs/common";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Users } from "src/common/entities/user.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Vehicle } from "src/common/entities/vehicle.entity";
import { VehicleDocument } from "src/common/entities/vehicle_documents.entity";
import { SharedModule } from "src/common/shared/shared.module";
import { Providers } from "src/common/entities/provider.entity";
import { DeliveryPersonDocument } from "src/common/entities/delivery_person_documents.entity";
import { ProviderDocuments } from "src/common/entities/providers_documents.entity";
import { ProviderContracts } from "src/common/entities/providers_contracts.entity";
import { Shipment } from "src/common/entities/shipment.entity";
import { DeliveryTransfer } from "src/common/entities/delivery_transfer.entity";
import { Appointments } from "src/common/entities/appointments.entity";
import { Transfer } from "src/common/entities/transfers.entity";
import { TransferProvider } from "src/common/entities/transfers_provider.entity";
import { SubscriptionTransaction } from "src/common/entities/subscription_transaction.entity";

@Module({
    imports: [        
            TypeOrmModule.forFeature([Users, DeliveryPerson, Vehicle, VehicleDocument, Providers, DeliveryPersonDocument, ProviderDocuments, ProviderContracts,
                Shipment, DeliveryTransfer, Appointments, Transfer, TransferProvider, SubscriptionTransaction

            ]),
            JwtModule.register({}),
            SharedModule,
        ],
    controllers: [DocumentController],
    providers: [DocumentService, JwtService],
    exports: [DocumentService, TypeOrmModule],
})
export class DocumentModule {
}