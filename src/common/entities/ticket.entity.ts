import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Admin } from './admin.entity';

@Entity({ name: 'tickets' })
export class Ticket {
    @PrimaryGeneratedColumn("uuid")
    ticket_id: string;

    @Column({ length: 50, nullable: false })
    status: string;

    @Column({ length: 50, nullable: true })
    state?: string;

    @Column({ type: 'json', nullable: false })
    description: any;

    @Column({ length: 255, nullable: false })
    title: string;

    @Column({ type: 'timestamp', nullable: true })
    creation_date?: Date;

    @Column({ type: 'timestamp', nullable: true })
    resolution_date?: Date;

    @Column({ length: 50, nullable: false })
    priority: string;

    @Column({ type: 'uuid', nullable: true })
    admin_id_attribute?: string;

    @Column({ type: 'uuid', nullable: true })
    admin_id_get?: string;

    @ManyToOne(() => Admin, { nullable: true })
    @JoinColumn({ name: 'admin_id_attribute' })
    adminAttribute?: Admin;

    @ManyToOne(() => Admin, { nullable: true })
    @JoinColumn({ name: 'admin_id_get' })
    adminGet?: Admin;
}
