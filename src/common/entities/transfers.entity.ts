import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryPerson } from './delivery_persons.entity';

@Entity('transfers')
export class Transfer {
    @PrimaryGeneratedColumn('uuid')
    transfer_id: string;

    @Column({ type: 'timestamp', nullable: false })
    date: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    amount: number;

    @ManyToOne(() => DeliveryPerson, (deliveryPerson) => deliveryPerson.transfers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'delivery_person_id' })
    delivery_person: DeliveryPerson;
}
