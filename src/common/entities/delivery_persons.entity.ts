import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Users } from './user.entity';
import { Admin } from './admin.entity';
import { Vehicle } from './vehicle.entity';
import { DeliveryPersonDocument } from './delivery_person_documents.entity';
import { Delivery } from './delivery.entity';

@Entity({ name: 'delivery_persons' })
export class DeliveryPerson {
    @PrimaryGeneratedColumn('uuid')
    delivery_person_id: string;

    @Column({ length: 255 })
    license: string;

    @Column({ length: 50, nullable: true })
    vehicle_number?: string;

    @Column({ length: 100 })
    vehicle_type: string;

    @Column({ type: 'varchar', length: 50 })
    status: string;

    @Column({ length: 255, unique: true })
    professional_email: string;

    @Column({ length: 50 })
    phone_number: string;

    @Column({ length: 100 })
    country: string;

    @Column({ length: 100 })
    city: string;

    @Column('text')
    address: string;

    @Column('text', { nullable: true })
    photo?: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    balance: number;

    @Column({ length: 255, unique: true, nullable: true })
    nfc_code?: string;

    @Column({ length: 255, nullable: true })
    stripe_transfer_id?: string;

    @Column('text', { nullable: true })
    description?: string;

    @Column({ length: 20, nullable: true })
    postal_code?: string;

    @Column({ default: false })
    validated: boolean;

    @ManyToOne(() => Users, user => user.user_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @ManyToOne(() => Admin, admin => admin.admin_id, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'admin_id' })
    admin?: Admin;

    @OneToMany(() => Vehicle, vehicle => vehicle.deliveryPerson)
    vehicles: Vehicle[];

    @OneToMany(() => DeliveryPersonDocument, DeliveryPersonDocument => DeliveryPersonDocument.delivery_person)
    DeliveryPersonDocuments: DeliveryPersonDocument[];

    @OneToMany(() => Delivery, (delivery) => delivery.delivery_person, { cascade: true })
    deliveries: Delivery[];
}
