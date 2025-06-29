import { Module } from '@nestjs/common';
import { AdminAuthModule } from './auth/auth.module';
import { WarehouseModule } from './warehouse/warehouse.module';
import { ClientModule } from './client/client.module';
import { MerchantModule } from './merchant/merchant.module';

@Module({
    imports: [
        AdminAuthModule,
        WarehouseModule,
        ClientModule,
        MerchantModule,
    ],
    providers: [],
})
export class DesktopModule {}