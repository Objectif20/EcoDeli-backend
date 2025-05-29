import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Users } from './user.entity';
import { MerchantSector } from './merchant_sector.entity';
import { MerchantContract } from './merchant_contract.entity';
import { MerchantDocument } from './merchant_document.entity';

@Entity({ name: 'merchants' })
export class Merchant {
    @PrimaryGeneratedColumn('uuid')
    merchant_id: string;

    @Column({ length: 255 })
    company_name: string;

    @Column({ length: 20, unique: true })
    siret: string;

    @Column('text')
    address: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    stripe_customer_id: string | null;

    @Column('text', { nullable: true })
    description?: string;

    @Column({ length: 20, nullable: true })
    postal_code?: string;

    @Column({ length: 100 })
    city: string;

    @Column({ length: 100 })
    country: string;

    @Column({ length: 20 })
    phone: string;

    @ManyToOne(() => Users, user => user.providers, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @OneToMany(() => MerchantSector, merchantSector => merchantSector.merchant)
    merchantSectors: MerchantSector[];

    @OneToMany(() => MerchantContract, merchantContract => merchantContract.merchant)
    merchantContracts: MerchantContract[];

    @OneToMany(() => MerchantDocument, merchantDocument => merchantDocument.merchant)
    merchantDocuments: MerchantDocument[];

    @Column({ type: 'varchar', length: 255, nullable: false })
    last_name: string;

    @Column({ type: 'varchar', length: 255, nullable: false })
    first_name: string;
}
