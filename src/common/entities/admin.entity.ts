import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// Table admin

// Correspond à table des administrateurs

@Entity({name : 'admin'})
export class Admin {

    @PrimaryGeneratedColumn("uuid")
    admin_id: string;

    @Column({ length: 255 })
    last_name: string;

    @Column({ length: 255 })
    first_name: string;

    @Column({length: 255 })
    email: string;

    @Column()
    password: string;

    @Column({ default: true })
    active: boolean;

    @Column({ default: false })
    super_admin: boolean;

    @Column({ nullable: true})
    photo: string;

    @Column({ default: false })
    two_factor_enabled: boolean;

    @Column({ nullable: true})
    one_signal_id: string;
}
