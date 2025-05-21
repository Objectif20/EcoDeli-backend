import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";
import { SharedModule } from "src/common/shared/shared.module";
import { ServicesService } from "./services.service";
import { ServicesController } from "./services.controller";
import { Client } from "src/common/entities/client.entity";
import { Appointments } from "src/common/entities/appointments.entity";
import { ServicesList } from "src/common/entities/services_list.entity";


@Module({
    imports: [
        TypeOrmModule.forFeature([Client, Appointments, ServicesList]),
        JwtModule.register({}),
        SharedModule,
    ],
    controllers: [ServicesController],
    providers: [JwtService,ServicesService],
    exports: [TypeOrmModule,ServicesService],
})
export class ServicesModule {}