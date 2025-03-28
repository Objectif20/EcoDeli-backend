import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { Admin } from "./admin.entity";
import { Services } from "./service.entity";
import { ProviderKeywords } from "./provider_keyword.entity";
import { ServiceImage } from "./services_image.entity";
import { FavoriteService } from "./favorite_services.entity";
import { Appointment } from "./appointments.entity";

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

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  price: number;

  @Column({ type: "decimal", precision: 10, scale: 2, nullable: true })
  price_admin: number;

  @Column({ type: "int", nullable: true })
  duration_minute: number;

  @Column({ default: true })
  available: boolean;

  @ManyToOne(() => Admin, { nullable: true })
  @JoinColumn({ name: "admin_id" })
  admin: Admin;

  @OneToMany(() => Services, service => service.serviceList)
  services: Services[];

  @OneToMany(() => ProviderKeywords, keyword => keyword.service)
  keywords: ProviderKeywords[];

  @OneToMany(() => ServiceImage, image => image.serviceList)
  images: ServiceImage[];

  @OneToMany(() => FavoriteService, (favoriteService) => favoriteService.service)
  favorite_services: FavoriteService[];

  @OneToMany(() => Appointment, (appointment) => appointment.service)
  appointments: Appointment[];

}
