import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { GeneralService } from './general.service';
import { GeneralController } from './general.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from 'src/common/entities/category.entity';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Providers } from 'src/common/entities/provider.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Category, DeliveryPerson, Providers]),
        JwtModule.register({}),
        SharedModule
    ],
    providers: [GeneralService, JwtService],
    controllers: [GeneralController],
    exports: [JwtModule],
})
export class GeneralModule { }