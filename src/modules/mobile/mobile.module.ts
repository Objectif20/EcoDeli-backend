import { Module } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';
import { DeliveriesModule } from './deliveries/deliveries.module';

@Module({
    imports: [ClientAuthModule, ProfileModule, DeliveriesModule],
    providers: [],
})
export class MobileModule {}