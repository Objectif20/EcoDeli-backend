import { Module } from '@nestjs/common';
import { ClientAuthModule } from './auth/auth.module';

@Module({
    imports: [ClientAuthModule],
    providers: [],
})
export class MobileModule {}