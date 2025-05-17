import { Module } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';
import { ProfileModule } from './profile/profile.module';

@Module({
    imports: [ClientAuthModule, ProfileModule],
    providers: [],
})
export class MobileModule {}