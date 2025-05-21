import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Users } from './user.entity';
import { Delivery } from './delivery.entity';
import { DeliveryKeyword } from './delivery_keywords.entity';
import { Store } from './stores.entity';
import { Parcel } from './parcels.entity';
import { Favorite } from './favorites.entity';
import { Point } from 'geojson';

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

    @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
    departure_location: Point | null;

    @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
    arrival_location: Point | null;

    @Column({type: 'varchar', length: 255, nullable: true})
    delivery_mail: string | null;

    @ManyToOne(() => Users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @Column({type : "boolean", default : false})
    trolleydrop: boolean;

    @OneToMany(() => Delivery, (delivery) => delivery.shipment)
    deliveries: Delivery[];

    @OneToMany(() => DeliveryKeyword, deliveryKeyword => deliveryKeyword.shipment)
    deliveryKeywords: DeliveryKeyword[];

    @OneToMany(() => Store, store => store.shipment)
    stores: Store[];

    @OneToMany(() => Parcel, (parcel) => parcel.shipment)
    parcels: Parcel[];

    @OneToMany(() => Favorite, (favorite) => favorite.shipment)
    favorites: Favorite[];

    @Column({ type: 'varchar', length: 255, nullable: true })
    arrival_address: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    departure_address: string | null;

    @Column({ type: 'varchar', length: 15, nullable: true })
    arrival_postal: string | null;

    @Column({ type: 'varchar', length: 15, nullable: true })
    departure_postal: string | null;

    @Column({ type: 'boolean', default: false })
    arrival_handling: boolean;

    @Column({ type: 'boolean', default: false })
    departure_handling: boolean;

    @Column({ type: 'int', default: 0 })
    floor_departure_handling: number;

    @Column({ type: 'boolean', default: false })
    elevator_departure: boolean;

    @Column({ type: 'int', default: 0 })
    floor_arrival_handling: number;

    @Column({ type: 'boolean', default: false })
    elevator_arrival: boolean;
}
