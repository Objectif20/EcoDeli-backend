import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryPerson } from './delivery_persons.entity';

@Entity({ name: 'delivery_person_documents' })
export class DeliveryPersonDocument {
    @PrimaryGeneratedColumn('uuid')
    document_id: string;

    @Column({ length: 255 })
    name: string;

    @Column('text', { nullable: true })
    description?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    submission_date: Date;

    @Column('text')
    document_url: string;

    @ManyToOne(() => DeliveryPerson, deliveryPerson => deliveryPerson.delivery_person_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'delivery_person_id' })
    delivery_person: DeliveryPerson;
}
