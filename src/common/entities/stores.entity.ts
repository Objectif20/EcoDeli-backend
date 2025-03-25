import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Shipment } from './shipment.entity';
import { ExchangePoint } from './exchange_points.entity';

@Entity({ name: 'stores' })
export class Store {
    @PrimaryColumn({ type: 'uuid' })
    shipment_id: string;

    @PrimaryColumn({ type: 'uuid' })
    exchange_point_id: string;

    @Column({ type: 'int' })
    step: number;

    @Column({ type: 'timestamp' })
    start_date: Date;

    @Column({ type: 'timestamp' })
    end_date: Date;

    @ManyToOne(() => Shipment, shipment => shipment.stores, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shipment_id' })
    shipment: Shipment;

    @ManyToOne(() => ExchangePoint, exchangePoint => exchangePoint.stores, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'exchange_point_id' })
    exchangePoint: ExchangePoint;
}