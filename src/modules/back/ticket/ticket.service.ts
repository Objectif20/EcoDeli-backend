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
            relations: ['adminAttribute', 'adminGet'],
        });
    }

    async getTicketById(id: string): Promise<Ticket | null> {
        return await this.ticketRepository.findOne({
            where: { ticket_id: id },
            relations: ['adminAttribute', 'adminGet'],
        });
    }

    async getStoredTickets(): Promise<Ticket[]> {
        return await this.ticketRepository.find({
            where: { status: "closed" },
            relations: ['adminAttribute', 'adminGet'],
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
        const result = await this.ticketRepository.update(id, updateData as any);

        if (result.affected === 0) {
            return null;
        }

        return await this.ticketRepository.findOne({ where: { ticket_id: id } });
    }



    async deleteTicket(id: string): Promise<boolean> {
        const result: DeleteResult = await this.ticketRepository.delete(id);
        return !!(result.affected && result.affected > 0);
    }

}