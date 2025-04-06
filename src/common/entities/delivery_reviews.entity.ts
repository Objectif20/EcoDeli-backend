import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Delivery } from './delivery.entity';
import { DeliveryReviewResponse } from './delivery_review_responses.entity';

@Entity({ name: 'delivery_reviews' })
export class DeliveryReview {
    @PrimaryGeneratedColumn('uuid')
    review_id: string;

    @Column({ type: 'int' })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment?: string;

    @Column({ type: 'uuid' })
    delivery_id: string;

    @ManyToOne(() => Delivery, delivery => delivery.deliveryReviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'delivery_id' })
    delivery: Delivery;

    @OneToMany(() => DeliveryReviewResponse, response => response.review)
    responses: DeliveryReviewResponse[];
}