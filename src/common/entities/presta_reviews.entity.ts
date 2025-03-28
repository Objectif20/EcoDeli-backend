import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, OneToMany } from 'typeorm';
import { Appointment } from './appointments.entity';
import { PrestaReviewResponse } from './presta_review_responses.entity';

@Entity('presta_reviews')
export class PrestaReview {
    @PrimaryGeneratedColumn('uuid')
    review_presta_id: string;

    @Column({ type: 'int', nullable: false })
    rating: number;

    @Column({ type: 'text', nullable: true })
    comment: string | null;

    @OneToOne(() => Appointment, (appointment) => appointment.review_presta, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'appointment_id' })
    appointment: Appointment;

    @OneToMany(() => PrestaReviewResponse, (response) => response.review, { cascade: true })
    responses: PrestaReviewResponse[];
}
