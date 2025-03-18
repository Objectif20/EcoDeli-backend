import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { Admin } from "./admin.entity";
import { Services } from "./service.entity";
import { ProviderKeywords } from "./provider_keyword.entity";

@Entity({ name: 'services_list' })
export class ServicesList {
    @PrimaryGeneratedColumn("uuid")
    service_id: string;

    @Column({ length: 255 })
    service_type: string;

    @Column({ length: 50 })
    status: string;

    @Column({ default: false })
    validated: boolean;

    @Column({ length: 255 })
    name: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ length: 100, nullable: true })
    city: string;

    @ManyToOne(() => Admin, { nullable: true })
    @JoinColumn({ name: "admin_id" })
    admin: Admin;

    @OneToMany(() => Services, service => service.serviceList)
    services: Services[];

    @OneToMany(() => ProviderKeywords, keyword => keyword.service)
    keywords: ProviderKeywords[];
}
