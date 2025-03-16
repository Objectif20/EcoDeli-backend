import { Injectable } from '@nestjs/common';
import { InjectRepository, } from '@nestjs/typeorm';
import { Repository, Not, DeleteResult } from 'typeorm';


import { TicketDto } from './dto/ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from 'src/common/entities/ticket.entity';

@Injectable()
export class TicketService {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>,
    ) { }


    async getTickets(): Promise<Ticket[]> {
        return await this.ticketRepository.find({
            where: { status: Not("closed") },
        });
    }

    async getTicketById(id: string): Promise<Ticket | null> {
        return await this.ticketRepository.findOne({
            where: { ticket_id: id },
        });
    }

    async getStoredTickets(): Promise<Ticket[]> {
        return await this.ticketRepository.find({
            where: { status: "closed" },
        });
    }

    async createTicket(data: TicketDto): Promise<Ticket> {
        try {
            const newTicket = this.ticketRepository.create(data);
            return await this.ticketRepository.save(newTicket);
        } catch (error) {
            throw new Error(`Une erreur est survenue lors de la création du ticket : ${error.message}`);
        }
    }

    async updateTicket(id: string, updateData: UpdateTicketDto): Promise<Ticket | null> {
        const ticket = await this.ticketRepository.findOne({ where: { ticket_id: id } });

        if (!ticket) {
            return null;
        }

        Object.assign(ticket, updateData);

        return await this.ticketRepository.save(ticket);
    }

    async deleteTicket(id: string): Promise<boolean> {
        const result: DeleteResult = await this.ticketRepository.delete(id);
        return !!(result.affected && result.affected > 0);
    }

}