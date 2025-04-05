import { Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { Users } from './user.entity';
import { ServicesList } from './services_list.entity';

@Entity('favorite_services')
export class FavoriteService {
    @PrimaryColumn({ type: 'uuid' })
    service_id: string;

    @PrimaryColumn({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => ServicesList, (service) => service.service_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'service_id' })
    service: ServicesList;

    @ManyToOne(() => Users, (user) => user.user_id, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;
}
