import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Users } from './user.entity';
import { ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AdminReport } from './admin_reports.entity';

@Entity({ name: 'reports' })
export class Report {

    @PrimaryGeneratedColumn('uuid')
    report_id: string;

    @Column({ length: 255 })
    status: string;

    @Column({ length: 255, nullable: true })
    report_message?: string;

    @Column({ length: 255 })
    state: string;

    @OneToMany(() => AdminReport, adminReport => adminReport.report)
    adminReports: AdminReport[];

    @ManyToOne(() => Users)
    @JoinColumn({ name: 'user_id' })
    user: Users;
}
