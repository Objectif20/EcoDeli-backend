import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Subscription } from './subscription.entity';

@Entity({ name: 'plans' })
export class Plan {
    @PrimaryGeneratedColumn()
    plan_id: number;

    @Column({ length: 255 })
    name: string;

    @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
    price?: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.00 })
    priority_shipping_percentage: number;

    @Column({ type: 'int', default: 0 })
    priority_months_offered: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    max_insurance_coverage: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    extra_insurance_price: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.00 })
    shipping_discount: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    permanent_discount: number;

    @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.00 })
    permanent_discount_percentage: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    small_package_permanent_discount: number;

    @Column({ type: 'boolean', default: false })
    first_shipping_free: boolean;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0.00 })
    first_shipping_free_threshold: number;

    @Column({ type: 'boolean', default: false })
    is_pro: boolean;

    @OneToMany(() => Subscription, subscription => subscription.plan_obj)
    subscriptions: Subscription[];

    @Column({ length: 255, nullable: true })
    stripe_product_id: string;

    @Column({ length: 255, nullable: true })
    stripe_price_id: string;

}