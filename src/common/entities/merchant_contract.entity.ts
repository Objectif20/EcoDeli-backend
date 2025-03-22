import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Merchant } from './merchant.entity';

@Entity({ name: 'merchant_contract' })
export class MerchantContract {
    @PrimaryGeneratedColumn('uuid')
    contract_id: string;

    @Column({ length: 255 })
    company_name: string;

    @Column({ length: 20, unique: true })
    siret: string;

    @Column('text')
    address: string;

    @ManyToOne(() => Merchant, merchant => merchant.merchantContracts, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'merchant_id' })
    merchant: Merchant;
}
