import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Delivery } from './delivery.entity';

@Entity('delivery_commission')
export class DeliveryCommission {
    @PrimaryGeneratedColumn('uuid')
    delivery_commission_id: string;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: false })
    percentage: number;

    @Column({ type: 'boolean', default: true })
    active: boolean;

    @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
    stripe_percentage: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    stripe_commission: number | null;

    @OneToMany(() => Delivery, (delivery) => delivery.delivery_commission, { cascade: true })
    deliveries: Delivery[];
}
