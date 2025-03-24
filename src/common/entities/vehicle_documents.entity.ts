import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Vehicle } from './vehicle.entity';

@Entity({ name: 'vehicle_documents' })
export class VehicleDocument {
    @PrimaryGeneratedColumn('uuid')
    vehicle_document_id: string;

    @Column({ length: 255 })
    name: string;

    @Column('text', { nullable: true })
    description?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    submission_date: Date;

    @Column('text')
    vehicle_document_url: string;

    @Column({ type: 'uuid' })
    vehicle_id: string;

    @ManyToOne(() => Vehicle, (vehicle) => vehicle.vehicleDocuments)
    @JoinColumn({ name: 'vehicle_id' })
    vehicle: Vehicle;
}