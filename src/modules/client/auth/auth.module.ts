import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthController } from "./auth.controller";
import { JwtService } from "src/config/jwt.service";
import { JwtModule } from "@nestjs/jwt";
import { Users } from "src/common/entities/user.entity";
import { Client } from "src/common/entities/client.entity";
import { Providers } from "src/common/entities/provider.entity";
import { DeliveryPerson } from "src/common/entities/delivery_persons.entity";
import { Merchant } from "src/common/entities/merchant.entity";
import { AuthService } from "./auth.service";


@Module({

    imports: [
        TypeOrmModule.forFeature([Users, Client, Providers, DeliveryPerson, Merchant]),
        JwtModule.register({})
    ],
    controllers: [],
    providers: [AuthController, JwtService, AuthService],
    exports: [TypeOrmModule, AuthService],


})
export class AuthModule {}