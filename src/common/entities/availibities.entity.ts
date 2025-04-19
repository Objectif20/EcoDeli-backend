import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Providers } from "./provider.entity";

@Entity({ name: 'availabilities' })
export class Availability {
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @ManyToOne(() => Providers, provider => provider.availabilities)
    @JoinColumn({ name: "provider_id" })
    provider: Providers;

    @Column("int")
    day_of_week: number; 

    @Column("boolean")
    morning: boolean;  

    @Column("boolean")
    afternoon: boolean;  

    @Column("boolean", { default: false })
    evening: boolean; 

    @Column("time", { nullable: true })
    morning_start_time: string;  

    @Column("time", { nullable: true })
    morning_end_time: string;  

    @Column("time", { nullable: true })
    afternoon_start_time: string; 

    @Column("time", { nullable: true })
    afternoon_end_time: string; 

    @Column("time", { nullable: true })
    evening_start_time: string;

    @Column("time", { nullable: true })
    evening_end_time: string;
}
