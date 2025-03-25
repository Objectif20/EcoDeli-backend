import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { DeliveryKeyword } from './delivery_keywords.entity';

@Entity({ name: 'keywords' })
export class Keyword {
    @PrimaryGeneratedColumn('uuid')
    keyword_id: string;

    @Column({ type: 'varchar', length: 255, unique: true })
    keyword: string;

    @OneToMany(() => DeliveryKeyword, deliveryKeyword => deliveryKeyword.keyword)
    deliveryKeywords: DeliveryKeyword[];
}