import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';  
import { AdminAuthModule } from './auth/auth.module';
import { GuardsModule } from 'src/common/guards/guards.module';
import { AdminProfileModule } from './profile/profile.module';
import { TicketModule } from './ticket/ticket.module';
import { ProviderModule } from './provider/provider.module';
import { ReportModule } from './reports/report.module';

@Module({
  imports: [GlobalModule, AdminAuthModule, AdminProfileModule, GuardsModule, TicketModule, ProviderModule, ReportModule],
  providers: [],
})
export class BackModule {}
