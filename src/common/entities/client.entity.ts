import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique, JoinColumn } from 'typeorm';
import { Users } from './user.entity';

@Entity('clients')
@Unique(['stripe_customer_id'])
export class Client {
  @PrimaryGeneratedColumn('uuid')
  client_id: string;

  @Column({ length: 255 })
  last_name: string;

  @Column({ length: 255 })
  first_name: string;

  @Column({ length: 255, nullable: true })
  stripe_customer_id?: string;

  @ManyToOne(() => Users, (user) => user.clients, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;
}
