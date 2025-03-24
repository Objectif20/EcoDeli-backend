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


@Module({

    imports: [
        TypeOrmModule.forFeature([Users, Client, Providers, DeliveryPerson, Merchant, Languages, Themes]),
        JwtModule.register({})
    ],
    controllers: [RegisterController],
    providers: [RegisterController, JwtService, RegisterService],
    exports: [TypeOrmModule, RegisterService],


})
export class RegisterModule {}