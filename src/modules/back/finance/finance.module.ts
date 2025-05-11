import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [FinanceService],
    controllers: [FinanceController],
    exports: [TypeOrmModule, JwtModule],
})
export class FinanceModule { }