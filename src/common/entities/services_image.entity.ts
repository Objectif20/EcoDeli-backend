import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { ServicesList } from './services_list.entity';

@Entity({ name: 'service_images' })
export class ServiceImage {
  @PrimaryGeneratedColumn('uuid')
  image_service_id: string;

  @Column('text')
  image_service_url: string;

  @ManyToOne(() => ServicesList, serviceList => serviceList.images)
  @JoinColumn({ name: 'service_id' })
  serviceList: ServicesList;
}
