import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';  
import { AdminAuthModule } from './auth/auth.module';
import { GuardsModule } from 'src/common/guards/guards.module';
import { AdminProfileModule } from './profile/profile.module';
import { TicketModule } from './ticket/ticket.module';
import { ProviderModule } from './provider/provider.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [GlobalModule, AdminAuthModule, AdminProfileModule, GuardsModule, TicketModule, ProviderModule, MailModule],
  providers: [],
})
export class BackModule {}
