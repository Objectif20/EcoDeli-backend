import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity({ name: 'subscription_transactions' })
export class SubscriptionTransaction {
    @PrimaryGeneratedColumn('uuid')
    transaction_id: string;

    @ManyToOne(() => Subscription, subscription => subscription.subscription_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'subscription_id' })
    subscription: Subscription;

    @Column({ type: 'int' })
    month: number;

    @Column({ type: 'int' })
    year: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price_at_transaction: number;

    @Column({ type: 'text' })
    invoice_url: string;

    @CreateDateColumn({ type: 'timestamp' })
    created_at: Date;
}
