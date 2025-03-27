import { Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { Shipment } from './shipment.entity';
import { DeliveryPerson } from './delivery_persons.entity';

@Entity('favorites')
export class Favorite {
    @PrimaryColumn('uuid')
    shipment_id: string;

    @PrimaryColumn('uuid')
    delivery_person_id: string;

    @ManyToOne(() => Shipment, (shipment) => shipment.favorites, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shipment_id' })
    shipment: Shipment;

    @ManyToOne(() => DeliveryPerson, (deliveryPerson) => deliveryPerson.favorites, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'delivery_person_id' })
    delivery_person: DeliveryPerson;
}
