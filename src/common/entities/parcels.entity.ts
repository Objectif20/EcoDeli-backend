import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Shipment } from './shipment.entity';
import { ParcelImage } from './parcel_images.entity';

@Entity('parcels')
export class Parcel {
    @PrimaryGeneratedColumn('uuid')
    parcel_id: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    name: string;

    @Column({ type: 'decimal', precision: 7, scale: 2, nullable: true })
    weight: number | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    estimate_price: number | null;

    @Column({ type: 'boolean', nullable: true })
    fragility: boolean | null;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    volume: number | null;

    // Une expédition peut avoir plusieurs colis
    @ManyToOne(() => Shipment, (shipment) => shipment.parcels, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shipment_id' })
    shipment: Shipment;

    // Un colis peut avoir plusieurs images
    @OneToMany(() => ParcelImage, (image) => image.parcel)
    images: ParcelImage[];
}
