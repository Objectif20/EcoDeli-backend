import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Providers } from './provider.entity';

@Entity('transfers_provider')
export class TransferProvider {
  @PrimaryGeneratedColumn('uuid')
  transfer_id: string;

  @Column({ type: 'timestamp', nullable: false })
  date: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount: number;

  @ManyToOne(() => Providers, (provider) => provider.transfers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'provider_id' })
  provider: Providers;

  @Column({ type: 'varchar', length: 10, default: 'auto' })
  type: 'auto' | 'not-auto';

  @Column({ type: 'text', nullable: true })
  url?: string;

  @Column({ type: 'text', nullable: true })
  stripe_id?: string;
}
