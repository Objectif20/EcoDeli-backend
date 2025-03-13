import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketDto } from './dto/ticket.dto';


import { Ticket } from 'src/common/entities/ticket.entity';

@Injectable()
export class TicketService {
    constructor(
        @InjectRepository(Ticket)
        private readonly ticketRepository: Repository<Ticket>,
    ) { }


    getPoulet(): string {
        return 'Bienvenue sur mon pouleteheh';
    }

    async createTicket(data: TicketDto): Promise<Ticket> {
        try {
            const newTicket = this.ticketRepository.create(data);
            return await this.ticketRepository.save(newTicket);
        } catch (error) {
            throw new Error(`Une erreur est survenue lors de la création du ticket : ${error.message}`);
        }
    }

}