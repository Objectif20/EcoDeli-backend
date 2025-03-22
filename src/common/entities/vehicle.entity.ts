import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryPerson } from './delivery_persons.entity';
import { Admin } from './admin.entity';
import { Category } from './category.entity';

@Entity({ name: 'vehicles' })
export class Vehicle {
    @PrimaryGeneratedColumn('uuid')
    vehicle_id: string;

    @Column({ length: 255 })
    model: string;

    @Column({ length: 50, unique: true })
    registration_number: string;

    @Column({ default: false })
    electric: boolean;

    @Column({ default: false })
    validated: boolean;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    co2_consumption?: number;

    @Column('text', { nullable: true })
    image_url?: string;

    @ManyToOne(() => DeliveryPerson, deliveryPerson => deliveryPerson.delivery_person_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'delivery_person_id' })
    deliveryPerson: DeliveryPerson;

    @ManyToOne(() => Category, category => category.category_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'category_id' })
    category: Category;

    @ManyToOne(() => Admin, admin => admin.admin_id, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'val_by_admin_id' })
    validatedByAdmin?: Admin;
}
