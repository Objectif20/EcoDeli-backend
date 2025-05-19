import { Module } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { ShipmentsModule } from './shipments/shipments.module';

@Module({
    imports: [ClientAuthModule, ProfileModule, DeliveriesModule, ShipmentsModule],
    providers: [],
})
export class MobileModule {}