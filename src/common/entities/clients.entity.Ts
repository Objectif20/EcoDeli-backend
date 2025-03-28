import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Users } from './user.entity';
import { Appointment } from './appointments.entity';

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

    @OneToOne(() => Users, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @OneToMany(() => Appointment, (appointment) => appointment.client)
    appointments: Appointment[];

}
