import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany, OneToOne } from "typeorm";
import { Themes } from "./theme.entity";
import { Languages } from "./languages.entity";
import { Merchant } from './merchant.entity';
import { Subscription } from './subscription.entity';
import { Client } from "./client.entity";
import { DeliveryPerson } from "./delivery_persons.entity";


@Entity({ name: 'users' })
export class Users {
    @PrimaryGeneratedColumn("uuid")
    user_id: string;

    @Column({ unique: true, length: 255 })
    email: string;

    @Column("text")
    password: string;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    creation_date: Date;

    @Column({ default: false })
    banned: boolean;

    @Column({ type: "timestamp", nullable: true })
    ban_date: Date;

    @Column({ type: "text", nullable: true })
    profile_picture: string;

    @Column({ default: false })
    newsletter: boolean;

    @Column({ type: "timestamp", nullable: true })
    last_login: Date;

    @Column({ default: false })
    confirmed: boolean;

    @Column({ default: false })
    tutorial_done: boolean;

    @Column({ default: false })
    dark_mode_enabled: boolean;

    @Column({ default: false })
    two_factor_enabled: boolean;

    @Column({ type: "text", nullable: true })
    one_signal_id: string;

    @ManyToOne(() => Themes, theme => theme.users)
    @JoinColumn({ name: "theme_id" })
    theme: Themes;

    @ManyToOne(() => Languages, language => language.users)
    @JoinColumn({ name: "language_id" })
    language: Languages;

    @Column({ type: "text", nullable: true })
    secret_totp: string;

    @OneToMany(() => Merchant, merchant => merchant.user)
    providers: Merchant[];

    @OneToMany(() => Client, client => client.user)
    clients: Client[];

    @OneToMany(() => Subscription, subscription => subscription.user)
    subscriptions: Subscription[];

    @Column({ nullable: true, type: 'varchar', default: null })
    password_code?: string | null;

    @Column({ nullable: true, type: 'varchar', default: null })
    validate_code?: string | null;

    @OneToOne(() => DeliveryPerson, deliveryPerson => deliveryPerson.user)
    deliveryPerson: DeliveryPerson;
}
