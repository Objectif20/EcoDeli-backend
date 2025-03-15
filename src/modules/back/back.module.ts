import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';  
import { AdminAuthModule } from './auth/auth.module';
import { GuardsModule } from 'src/common/guards/guards.module';

@Module({
  imports: [GlobalModule, AdminAuthModule, GuardsModule],
  providers: [],
})
export class BackModule {}
