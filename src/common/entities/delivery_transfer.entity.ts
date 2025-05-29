import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Delivery } from './delivery.entity';

@Entity('delivery_transfer')
export class DeliveryTransfer {
  @PrimaryColumn('uuid')
  delivery_transfer_id: string;

  @Column({ type: 'timestamp without time zone' })
  date: Date;

  @Column('numeric')
  amount: number;

  @ManyToOne(() => Delivery, (delivery) => delivery.transfers, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'delivery_id' })
  delivery: Delivery;

  @Column({ type: 'varchar' })
  type: string;

  @Column({ type: 'text', nullable: true })
  url?: string;

  @Column({ type: 'text', nullable: true })
  stripe_id?: string;
}
