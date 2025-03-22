import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';
import { Vehicle } from 'src/common/entities/vehicle.entity';
import { DeliveryPersonService } from './delivery_person.service';
import { DeliveryPersonController } from './delivery_person.controller';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { Admin } from 'src/common/entities/admin.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([DeliveryPerson, Vehicle, Admin]),
        JwtModule.register({}),
        SharedModule
    ],
    providers: [DeliveryPersonService, JwtService],
    controllers: [DeliveryPersonController],
    exports: [TypeOrmModule, JwtModule],
})
export class DeliveryPersonModule { }