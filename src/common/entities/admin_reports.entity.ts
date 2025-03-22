import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { Report } from './report.entity';
import { Admin } from './admin.entity';

@Entity({ name: 'admin_report' })
export class AdminReport {
    @PrimaryColumn('uuid')
    report_id: string;

    @ManyToOne(() => Report)
    @JoinColumn({ name: 'report_id' })
    report: Report;

    @ManyToOne(() => Admin)
    @JoinColumn({ name: 'admin_id' })
    admin: Admin;
}
