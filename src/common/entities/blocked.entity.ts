import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Users } from './user.entity';

@Entity({ name: 'blocked' })
export class Blocked {
  @PrimaryColumn('uuid')
  user_id: string;

  @PrimaryColumn('uuid')
  user_id_blocked: string;

  @CreateDateColumn({ name: 'date_blocked' })
  date_blocked: Date;

  @ManyToOne(() => Users, user => user.blockedUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @ManyToOne(() => Users, user => user.blockedByUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id_blocked' })
  blocked: Users;
}
