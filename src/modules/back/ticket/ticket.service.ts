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
        return await this.ticketRepository.createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.adminAttribute', 'adminAttribute')
            .leftJoinAndSelect('ticket.adminGet', 'adminGet')
            .select([
                'ticket',
                'adminAttribute.first_name',
                'adminAttribute.last_name',
                'adminAttribute.photo',

                'adminGet.first_name',
                'adminGet.last_name',
                'adminGet.photo'
            ])
            .where('ticket.status != :status', { status: "closed" })
            .getMany();
    }


    async getTicketById(id: string): Promise<Ticket | null> {
        return await this.ticketRepository.createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.adminAttribute', 'adminAttribute')
            .leftJoinAndSelect('ticket.adminGet', 'adminGet')
            .select([
                'ticket',
                'adminAttribute.first_name',
                'adminAttribute.last_name',
                'adminAttribute.photo',

                'adminGet.first_name',
                'adminGet.last_name',
                'adminGet.photo'
            ])
            .where('ticket.ticket_id = :id', { id })
            .getOne();
    }


    async getStoredTickets(): Promise<Ticket[]> {
        return await this.ticketRepository.createQueryBuilder('ticket')
            .leftJoinAndSelect('ticket.adminAttribute', 'adminAttribute')
            .leftJoinAndSelect('ticket.adminGet', 'adminGet')
            .select([
                'ticket',
                'adminAttribute.first_name',
                'adminAttribute.last_name',
                'adminAttribute.photo',

                'adminGet.first_name',
                'adminGet.last_name',
                'adminGet.photo'
            ])
            .where('ticket.status = :status', { status: "closed" })
            .getMany();
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