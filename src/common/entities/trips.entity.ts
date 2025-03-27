import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryPerson } from './delivery_persons.entity';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  trip_id: string;

  @Column({ type: 'text', nullable: false })
  departure_location: string;

  @Column({ type: 'text', nullable: false })
  arrival_location: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  departure_city: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  arrival_city: string;

  @Column({ type: 'timestamp', nullable: false })
  date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  tolerated_radius: number;

  @ManyToOne(() => DeliveryPerson, (deliveryPerson) => deliveryPerson.trips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_person_id' })
  delivery_person: DeliveryPerson;
}
