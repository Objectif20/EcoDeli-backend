import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { Appointments } from 'src/common/entities/appointments.entity';
import { Transfer } from 'src/common/entities/transfers.entity';
import { TransferProvider } from 'src/common/entities/transfers_provider.entity';
import { DeliveryTransfer } from 'src/common/entities/delivery_transfer.entity';
import { SubscriptionTransaction } from 'src/common/entities/subscription_transaction.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Appointments, Transfer, TransferProvider, DeliveryTransfer,SubscriptionTransaction]),
        JwtModule.register({}),
        SharedModule,
    ],
    providers: [FinanceService],
    controllers: [FinanceController],
    exports: [TypeOrmModule, JwtModule],
})
export class FinanceModule { }