import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { Users } from './user.entity';

@Entity('clients')
@Unique(['stripeCustomerId'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  clientId: string;

  @Column({ length: 255 })
  lastName: string;

  @Column({ length: 255 })
  firstName: string;

  @Column({ length: 255, nullable: true })
  stripeCustomerId?: string;

  @ManyToOne(() => Users, (user) => user.clients, { onDelete: 'CASCADE' })
  user: Users;
}
