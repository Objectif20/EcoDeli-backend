import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Users } from './user.entity';
import { Delivery } from './delivery.entity';
import { DeliveryKeyword } from './delivery_keywords.entity';
import { Store } from './stores.entity';

@Entity('shipments')
export class Shipment {
    @PrimaryGeneratedColumn('uuid')
    shipment_id: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    estimated_total_price: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    proposed_delivery_price: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    weight: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    volume: number | null;

    @Column({ type: 'timestamp', nullable: true })
    deadline_date: Date | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    time_slot: string | null;

    @Column({ type: 'boolean', default: false })
    urgent: boolean;

    @Column({ type: 'varchar', length: 50, nullable: true })
    status: string | null;

    @Column({ type: 'text', nullable: true })
    image: string | null;

    @Column({ type: 'int', default: 0 })
    views: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    departure_city: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    arrival_city: string | null;

    @Column({ type: 'text', nullable: true })
    departure_location: string | null;

    @Column({ type: 'text', nullable: true })
    arrival_location: string | null;

    @ManyToOne(() => Users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @OneToMany(() => Delivery, (delivery) => delivery.shipment)
    deliveries: Delivery[];

    @OneToMany(() => DeliveryKeyword, deliveryKeyword => deliveryKeyword.shipment)
    deliveryKeywords: DeliveryKeyword[];

    @OneToMany(() => Store, store => store.shipment)
    stores: Store[];
}
