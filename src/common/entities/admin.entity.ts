import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Languages } from './languages.entity';

// Table admin

// Correspond à table des administrateurs

@Entity({name : 'admins'})
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
    photo?: string;

    @Column({ default: false })
    two_factor_enabled: boolean;

    @Column({ nullable: true})
    one_signal_id?: string;

    @Column({ nullable: true})
    otp?: string;

    @Column({ type: 'timestamp', nullable: true})
    last_login?: Date;

    @Column({ nullable: true, type: 'varchar', default: null })
    password_code?: string | null;

    @ManyToOne(() => Languages, (language) => language.language_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'language_id' })
    language: Languages;
}
