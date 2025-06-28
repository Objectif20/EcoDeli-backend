import { Module } from '@nestjs/common';
import { AdminAuthModule } from './auth/auth.module';
import { WarehouseModule } from './warehouse/warehouse.module';

@Module({
    imports: [
        AdminAuthModule,
        WarehouseModule
    ],
    providers: [],
})
export class DesktopModule {}