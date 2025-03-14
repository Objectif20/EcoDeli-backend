import { Body, Controller, Get, Post } from '@nestjs/common';

import { TicketService } from './ticket.service';
import { TicketDto } from './dto/ticket.dto';
import { Ticket } from 'src/common/entities/ticket.entity';

@Controller('admin/ticket')
export class TicketController {
    constructor(private readonly ticketService: TicketService) { }

    // // API : GET /admin/ticket
    // @Get()
    // async getTickets() {
    //   return await this.ticketService.getTickets();
    // }
  
    // API : POST /admin/ticket
    @Post()
    async createTicket(@Body() data: TicketDto): Promise<Ticket> {
        return await this.ticketService.createTicket(data);
    }

}