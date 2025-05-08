import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Users } from "./user.entity";
import { Admin } from "./admin.entity";
import { Services } from "./service.entity";
import { ProviderContracts } from "./providers_contracts.entity";
import { ProviderDocuments } from "./providers_documents.entity";
import { Availability } from "./availibities.entity";

@Entity({ name: 'providers' })
export class Providers {
    @PrimaryGeneratedColumn("uuid")
    provider_id: string;

    @Column({ length: 255 })
    company_name: string;

    @Column({ unique: true, length: 20 })
    siret: string;

    @Column("text")
    address: string;

    @Column({ length: 255 })
    service_type: string;

    @Column({ length: 255, nullable: true })
    stripe_transfer_id: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ length: 20 })
    postal_code: string;

    @Column({ length: 100 })
    city: string;

    @Column({ length: 100 })
    country: string;

    @Column({ unique: true, length: 20 })
    phone: string;

    @Column({ default: false })
    validated: boolean;

    @ManyToOne(() => Users, user => user.providers)
    @JoinColumn({ name: "user_id" })
    user: Users;

    @ManyToOne(() => Admin, { nullable: true })
    @JoinColumn({ name: "admin_id" })
    admin: Admin;

    @OneToMany(() => Services, service => service.provider)
    services: Services[];

    @OneToMany(() => ProviderContracts, contract => contract.provider)
    contracts: ProviderContracts[];

    @OneToMany(() => ProviderDocuments, document => document.provider)
    documents: ProviderDocuments[];

    @Column({ length: 255 })
    last_name: string;

    @Column({ length: 255 })
    first_name: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    balance: number;

    @OneToMany(() => Availability, availability => availability.provider)
    availabilities: Availability[];
}
