import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './user.entity';
import { Plan } from './plan.entity';


@Entity({ name: 'subscriptions' })
export class Subscription {
    @PrimaryGeneratedColumn('uuid')
    subscription_id: string;

    @Column({ length: 255 , nullable: true })
    stripe_customer_id: string;

    @Column({ length: 255, nullable: true })
    stripe_subscription_id: string;

    @Column({ length: 50, nullable: true })
    status?: string;

    @Column({ type: 'timestamp' })
    start_date: Date;

    @Column({ type: 'timestamp' })
    end_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    cancellation_date?: Date;

    @ManyToOne(() => Users, user => user.subscriptions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @ManyToOne(() => Plan, plan => plan.subscriptions, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'plan_id' })
    plan: Plan;

    @Column({ type: 'boolean', default: false })
    first_shipping_free_taken: boolean;


}