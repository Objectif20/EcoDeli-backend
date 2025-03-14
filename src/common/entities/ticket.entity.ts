import { Entity, PrimaryGeneratedColumn, Column, Timestamp, ManyToOne, JoinColumn } from 'typeorm';
import { Admin } from './admin.entity';

// Table tickets

// Correspond à la table des tickets


@Entity({ name: 'tickets' })
export class Ticket {

    @PrimaryGeneratedColumn("uuid")
    ticket_id: string;

    @Column({ length: 50 })
    status: string;

    @Column({ length: 50 })
    state: string;

    @Column({ type: 'json' })
    description: any;

    @Column({ length: 255 })
    title: string;

    @Column({ type: 'timestamp' })
    creation_date: Date;

    @Column({ type: 'timestamp' })
    resolution_date: Date;

    @Column({ length: 50 })
    priority: string;

    @ManyToOne(() => Admin)
    @JoinColumn({ name: 'admin_id_attribute' })
    adminAttribute: Admin;

    @ManyToOne(() => Admin)
    @JoinColumn({ name: 'admin_id_get' })
    adminGet: Admin;
}