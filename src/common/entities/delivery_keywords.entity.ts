import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Keyword } from './keywords.entity';
import { Shipment } from './shipment.entity';

@Entity({ name: 'delivery_keywords' })
export class DeliveryKeyword {
    @PrimaryColumn({ type: 'uuid' })
    keyword_id: string;

    @PrimaryColumn({ type: 'uuid' })
    shipment_id: string;

    @ManyToOne(() => Keyword, keyword => keyword.deliveryKeywords, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'keyword_id' })
    keyword: Keyword;

    @ManyToOne(() => Shipment, shipment => shipment.deliveryKeywords, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'shipment_id' })
    shipment: Shipment;
}