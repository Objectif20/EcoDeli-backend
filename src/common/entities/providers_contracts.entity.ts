import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Providers } from "./provider.entity";

@Entity({ name: 'provider_contracts' })
export class ProviderContracts {
    @PrimaryGeneratedColumn("uuid")
    provider_contract_id: string;

    @Column({ length: 255 })
    company_name: string;

    @Column({ unique: true, length: 20 })
    siret: string;

    @Column("text")
    address: string;

    @ManyToOne(() => Providers, provider => provider.contracts)
    @JoinColumn({ name: "provider_id" })
    provider: Providers;
}
