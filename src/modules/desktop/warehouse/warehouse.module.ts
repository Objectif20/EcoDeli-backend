import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WarehouseService } from './warehouse.service';
import { WarehouseController } from './warehouse.controller';



@Module({
    imports: [
        TypeOrmModule.forFeature([]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [WarehouseService],
    controllers: [WarehouseController],
})
export class WarehouseModule {}
