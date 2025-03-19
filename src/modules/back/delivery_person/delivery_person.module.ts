import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { DeliveryPersonService } from './delivery_person.service';
import { DeliveryPersonController } from './delivery_person.controller';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';

@Module({
    imports: [
        TypeOrmModule.forFeature([DeliveryPerson]),
        JwtModule.register({}),
        SharedModule
    ],
    providers: [DeliveryPersonService, JwtService],
    controllers: [DeliveryPersonController],
    exports: [TypeOrmModule, JwtModule],
})
export class DeliveryPersonModule { }
