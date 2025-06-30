import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { ServicesService } from './services.service';
import { ServicesController } from './services.controller';
import { Users } from 'src/common/entities/user.entity';
import { ServicesList } from 'src/common/entities/services_list.entity';
import { Services } from 'src/common/entities/service.entity';


@Module({
    imports: [
        TypeOrmModule.forFeature([Users, ServicesList, Services]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [ServicesService],
    controllers: [ServicesController],
    exports: [TypeOrmModule, JwtModule],
})
export class ServicesModule { }