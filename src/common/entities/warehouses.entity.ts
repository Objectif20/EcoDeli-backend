import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ExchangePoint } from './exchange_points.entity';

@Entity({ name: 'warehouses' })
export class Warehouse {
    @PrimaryGeneratedColumn('uuid')
    warehouse_id: string;

    @Column({ type: 'varchar', length: 255 })
    city: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    capacity: number;

    @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
    coordinates: any; // Il y a un type pour les coordonnés ? Ce n'est pas float

    @Column({ type: 'text', nullable: true })
    photo?: string;

    @Column({ type: 'text', nullable: true })
    description?: string;

    @OneToMany(() => ExchangePoint, exchangePoint => exchangePoint.warehouse)
    exchangePoints: ExchangePoint[];
}