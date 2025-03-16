import { Body, Controller, Get, Post, Patch, Delete, Param, NotFoundException } from '@nestjs/common';

import { TicketService } from './ticket.service';
import { TicketDto } from './dto/ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from 'src/common/entities/ticket.entity';

@Controller('admin/ticket')
export class TicketController {
    constructor(private readonly ticketService: TicketService) { }

    // API : GET /admin/ticket
    @Get()
    async getTickets(): Promise<Ticket[]> {
        return await this.ticketService.getTickets();
    }

    // API : GET /admin/ticket/stored
    @Get('stored')
    async getStoredTickets(): Promise<Ticket[]> {
        return await this.ticketService.getStoredTickets();
    }

    // API : GET /admin/ticket/:id
    @Get(':id')
    async getTicketById(@Param('id') id: string): Promise<Ticket> {
        const ticket = await this.ticketService.getTicketById(id);
        if (!ticket) {
            throw new NotFoundException(`Ticket avec l'ID ${id} non trouvé.`);
        }
        return ticket;
    }

    // API : POST /admin/ticket
    @Post()
    async createTicket(@Body() data: TicketDto): Promise<Ticket> {
        return await this.ticketService.createTicket(data);
    }

    // API : PATCH /admin/ticket/:id
    @Patch(':id')
    async updateTicket(@Param('id') id: string, @Body() updateData: UpdateTicketDto): Promise<Ticket> {
        const updatedTicket = await this.ticketService.updateTicket(id, updateData);
        if (!updatedTicket) {
            throw new NotFoundException(`Impossible de mettre à jour : Ticket avec l'ID ${id} non trouvé.`);
        }
        return updatedTicket;
    }

    // API : DELETE /admin/ticket/:id
    @Delete(':id')
    async deleteTicket(@Param('id') id: string): Promise<{ message: string }> {
        const deleted = await this.ticketService.deleteTicket(id);
        if (!deleted) {
            throw new NotFoundException(`Impossible de supprimer : Ticket avec l'ID ${id} non trouvé.`);
        }
        return { message: `Ticket avec l'ID ${id} supprimé.` };
    }

}