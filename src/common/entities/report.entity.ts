import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Users } from './user.entity';
import { ManyToOne, JoinColumn } from 'typeorm';

// Table reports (signalements)

@Entity({ name: 'reports' })
export class Report {

    @PrimaryGeneratedColumn('uuid')
    report_id: string;

    @Column({ length: 255 })
    status: string;

    @Column({ length: 255, nullable: true })
    assignment?: string;

    @Column({ length: 255 })
    state: string;

    @ManyToOne(() => Users)
    @JoinColumn({ name: 'user_id' })
    user_id: Users;
}
