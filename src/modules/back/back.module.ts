import { Module } from '@nestjs/common';
import { GlobalModule } from './global/global.module';
import { TicketModule } from './ticket/ticket.module';

@Module({
  imports: [GlobalModule, TicketModule],
  controllers: [],
  providers: [],
})
export class BackModule { }
