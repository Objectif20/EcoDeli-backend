import { Module } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { ServicesModule } from './services/services.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
    imports: [ClientAuthModule, ProfileModule, DeliveriesModule, ShipmentsModule,ServicesModule, DashboardModule],
    providers: [],
})
export class MobileModule {}