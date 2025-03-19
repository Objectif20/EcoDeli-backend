import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeleteResult } from 'typeorm';

import { DeliveryPerson } from 'src/common/entities/delivery_persons.entity';

@Injectable()
export class DeliveryPersonService {
    constructor(
        @InjectRepository(DeliveryPerson)
        private readonly deliveryPersonRepository: Repository<DeliveryPerson>,
    ) { }

    async updateDeliveryPersonStatus(id: string, status: 'Accepted' | 'Rejected'): Promise<DeliveryPerson | null> {
        const result = await this.deliveryPersonRepository.update(
            { delivery_person_id: id, status: 'On Going' },
            { status }
        );

        if (result.affected === 0) {
            throw new NotFoundException('Delivery person not found or not in On Going status');
        }

        return this.deliveryPersonRepository.findOne({
            where: { delivery_person_id: id },
            select: ['delivery_person_id', 'status', 'photo', 'professional_email'],
        });
    }


}
