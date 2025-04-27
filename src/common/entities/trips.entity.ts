import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryPerson } from './delivery_persons.entity';
import { Point } from 'geojson';

@Entity('trips')
export class Trip {
  @PrimaryGeneratedColumn('uuid')
  trip_id: string;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  departure_location: Point;

  @Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  arrival_location: Point;

  @Column({ type: 'timestamp', nullable: true })
  date: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  tolerated_radius: number;

  @ManyToOne(() => DeliveryPerson, (deliveryPerson) => deliveryPerson.trips, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_person_id' })
  delivery_person: DeliveryPerson;

  @Column({ type: 'varchar', length: 255, nullable: true })
  weekday: string | null;

  @Column({ type: 'varchar', length: 255, nullable: false })
  departure_city: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  arrival_city: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  comeback_today_or_tomorrow: string;
}
