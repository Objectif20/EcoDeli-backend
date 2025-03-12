import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';  
import { AdminAuthModule } from './auth/auth.module';

@Module({
  imports: [GlobalModule, AdminAuthModule],
  controllers: [],
  providers: [],
})
export class BackModule {}
