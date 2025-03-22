import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';
import { AdminAuthModule } from './auth/auth.module';
import { GuardsModule } from 'src/common/guards/guards.module';
import { AdminProfileModule } from './profile/profile.module';
import { TicketModule } from './ticket/ticket.module';
import { ProviderModule } from './provider/provider.module';
import { DeliveryPersonModule } from './delivery_person/delivery_person.module';
import { MailModule } from './mail/mail.module';
import { LanguagesModule } from './languages/languages.module';

@Module({
  imports: [
    GlobalModule,
    AdminAuthModule,
    AdminProfileModule,
    GuardsModule,
    TicketModule,
    ProviderModule,
    DeliveryPersonModule,
    MailModule,
    LanguagesModule,
  ],
  providers: [],
})
export class BackModule { }
