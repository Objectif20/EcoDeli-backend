import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Shipment } from './shipment.entity';
import { DeliveryCommission } from './delivery_commission.entity';
import { DeliveryPerson } from './delivery_persons.entity';
import { DeliveryReview } from './delivery_reviews.entity';

@Entity('deliveries')
export class Delivery {
    @PrimaryGeneratedColumn('uuid')
    delivery_id: string;

    @Column({ type: 'timestamp', nullable: false })
    send_date: Date;

    @Column({ type: 'timestamp', nullable: true })
    delivery_date: Date | null;

    @Column({ type: 'varchar', length: 50, nullable: false })
    status: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    stripe_payment_id: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
    amount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    commission: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    transferred_amount: number | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    payment_status: string | null;

    @Column({ type: 'timestamp', nullable: true })
    payment_date: Date | null;

    @Column({ type: 'timestamp', nullable: true })
    refund_date: Date | null;

    @ManyToOne(() => Shipment, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shipment_id' })
    shipment: Shipment;

    @ManyToOne(() => DeliveryCommission, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'delivery_commission_id' })
    delivery_commission: DeliveryCommission;

    @ManyToOne(() => DeliveryPerson, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'delivery_person_id' })
    delivery_person: DeliveryPerson; ù

    @OneToMany(() => DeliveryReview, review => review.delivery)
    deliveryReviews: DeliveryReview[];
}
