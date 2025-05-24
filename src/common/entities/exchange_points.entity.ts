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

    @Column({ type: 'uuid', nullable: true })
    warehouse_id: string;

    @ManyToOne(() => Warehouse, warehouse => warehouse.exchangePoints, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'warehouse_id' })
    warehouse: Warehouse | null;

    @Column({type : 'boolean', default: false})
    isbox: boolean;

    @OneToMany(() => Store, store => store.exchangePoint)
    stores: Store[];

    @Column({ type: 'varchar', length: 255 })
    address: string;

    @Column({ type: 'varchar', length: 15 })
    postal_code: string;
}