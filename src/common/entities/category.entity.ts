import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'categories' })
export class Category {
    @PrimaryGeneratedColumn()
    category_id: number;

    @Column({ length: 255, unique: true })
    name: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    max_weight: number;

    @Column({ length: 255 })
    max_dimension: string;

    @OneToMany(() => Vehicle, vehicle => vehicle.category)
    vehicles: Vehicle[];
}