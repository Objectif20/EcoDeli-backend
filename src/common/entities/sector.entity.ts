import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { MerchantSector } from './merchant_sector.entity';

@Entity({ name: 'sectors' })
export class Sector {
    @PrimaryGeneratedColumn('uuid')
    sector_id: string;

    @Column({ length: 255, unique: true })
    name: string;

    @OneToMany(() => MerchantSector, merchantSector => merchantSector.sector)
    merchantSectors: MerchantSector[];
}
