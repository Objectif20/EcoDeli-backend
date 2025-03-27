import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Parcel } from './parcels.entity';

@Entity('parcel_images')
export class ParcelImage {
    @PrimaryColumn({ type: 'varchar', length: 250 })
    image_url: string;

    // Chaque image appartient à un colis
    @ManyToOne(() => Parcel, (parcel) => parcel.images, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'parcel_id' })
    parcel: Parcel;
}
