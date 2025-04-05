import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { PrestaReview } from './presta_reviews.entity';

@Entity('presta_review_responses')
export class PrestaReviewResponse {
    @PrimaryGeneratedColumn('uuid')
    review_presta_response_id: string;

    @Column({ type: 'text', nullable: false })
    comment: string;

    @ManyToOne(() => PrestaReview, (review) => review.responses, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'review_presta_id' })
    review: PrestaReview;
}
