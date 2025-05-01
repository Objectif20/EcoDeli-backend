import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Warehouse } from './warehouses.entity';
import { Store } from './stores.entity';
import { Point } from 'geojson';


@Entity({ name: 'exchange_points' })
export class ExchangePoint {
    @PrimaryGeneratedColumn('uuid')
    exchange_point_id: string;

    @Column({ type: 'varchar', length: 255 })
    city: string;

    @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
    coordinates: Point;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @Column({ type: 'uuid' })
    warehouse_id: string;

    @ManyToOne(() => Warehouse, warehouse => warehouse.exchangePoints, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'warehouse_id' })
    warehouse: Warehouse;

    @OneToMany(() => Store, store => store.exchangePoint)
    stores: Store[];
}