import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { DeliveryReview } from './delivery_reviews.entity';

@Entity('delivery_review_responses')
export class DeliveryReviewResponse {
    @PrimaryGeneratedColumn('uuid')
    review_id_response: string;

    @Column({ type: 'text', nullable: false })
    comment: string;

    //Une réponse appartient à un avis
    @ManyToOne(() => DeliveryReview, (review) => review.responses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'review_id' })
    review: DeliveryReview;
}