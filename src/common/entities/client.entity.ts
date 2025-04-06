import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne } from 'typeorm';
import { Users } from './user.entity';

@Entity('clients')
export class Client {
    @PrimaryGeneratedColumn('uuid')
    client_id: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    last_name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    first_name: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    stripe_customer_id: string | null;

    @ManyToOne(() => Users, user => user.clients, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;
}