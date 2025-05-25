import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne, OneToMany } from 'typeorm';
import { Client } from './client.entity';
import { ServicesList } from './services_list.entity';
import { Providers } from './provider.entity';
import { PrestaReview } from './presta_reviews.entity';
import { ProviderCommission } from './provider_commissions.entity';

@Entity('appointments')
export class Appointments {
    @PrimaryGeneratedColumn('uuid')
    appointment_id: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    service_payment_id: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripe_payment_id: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    amount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    commission: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    transferred_amount: number | null;

    @Column({ type: 'varchar', length: 50, nullable: false })
    status: string;

    @Column({ type: 'timestamp', nullable: false })
    service_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    payment_date: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    refund_date: Date | null;

    @Column({ type: 'text', nullable: true })
    review: string | null;

    @Column({ type: "int", nullable: true })
    duration: number; 

    @ManyToOne(() => ProviderCommission, (commission) => commission.appointments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'presta_commission_id' })
    presta_commission: ProviderCommission;

    @ManyToOne(() => Client, (client) => client.client_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'client_id' })
    client: Client;

    @ManyToOne(() => ServicesList, (service) => service.service_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_id' })
    service: ServicesList;

    @ManyToOne(() => Providers, (provider) => provider.provider_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'provider_id' })
    provider: Providers;

    @OneToOne(() => PrestaReview, (review) => review.appointment)
    review_presta: PrestaReview;

    @Column({ type: "varchar", length : 64, nullable: true })
    code : string | null;

    @Column({type : "text" , nullable: true})
    url_file : string | null;
}
