import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
  } from 'typeorm';
import { Users } from './user.entity';
  
  @Entity('onesignal_devices')
  export class OneSignalDevice {
    @PrimaryGeneratedColumn('uuid')
    device_id: string;
  
    @Column({ type: 'text' })
    player_id: string;
  
    @ManyToOne(() => Users, (user) => user.devices, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: Users;

    @Column({type : "varchar" , length : 25 , default : null})
    platform: string | null; 
  }
  