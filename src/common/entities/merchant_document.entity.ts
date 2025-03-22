import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Merchant } from './merchant.entity';

@Entity({ name: 'merchant_documents' })
export class MerchantDocument {
    @PrimaryGeneratedColumn('uuid')
    merchant_document_id: string;

    @Column({ length: 255 })
    name: string;

    @Column('text', { nullable: true })
    description?: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    submission_date: Date;

    @Column('text')
    merchant_document_url: string;

    @ManyToOne(() => Merchant, merchant => merchant.merchantDocuments, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'merchant_id' })
    merchant: Merchant;
}
