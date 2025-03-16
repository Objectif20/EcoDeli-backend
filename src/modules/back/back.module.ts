import { Module } from '@nestjs/common';
import { TicketModule } from './ticket/ticket.module';
import { GlobalModule } from './global/global.module';  
import { AdminAuthModule } from './auth/auth.module';
import { GuardsModule } from 'src/common/guards/guards.module';
import { AdminProfileModule } from './profile/profile.module';

@Module({
  imports: [GlobalModule, AdminAuthModule,AdminProfileModule, GuardsModule, TicketModule],
  providers: [],
})
export class BackModule { }
