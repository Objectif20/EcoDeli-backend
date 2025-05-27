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

@Module({
    imports: [        
            TypeOrmModule.forFeature([Users, DeliveryPerson, Vehicle, VehicleDocument, Providers, DeliveryPersonDocument, ProviderDocuments, ProviderContracts,
                Shipment, DeliveryTransfer

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