import { Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { Merchant } from './merchant.entity';
import { Sector } from './sector.entity';

@Entity({ name: 'merchant_sector' })
export class MerchantSector {
    @PrimaryColumn('uuid')
    sector_id: string;

    @PrimaryColumn('uuid')
    merchant_id: string;

    @ManyToOne(() => Sector, sector => sector.merchantSectors, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'sector_id' })
    sector: Sector;

    @ManyToOne(() => Merchant, merchant => merchant.merchantSectors, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'merchant_id' })
    merchant: Merchant;
}
