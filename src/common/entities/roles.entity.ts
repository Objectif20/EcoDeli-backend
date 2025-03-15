import { Entity, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Admin } from './admin.entity';
import { RoleList } from './role_list.entity';

@Entity('roles')
export class Role {
  @PrimaryColumn('uuid')
  role_id: string;

  @PrimaryColumn('uuid')
  admin_id: string;

  @ManyToOne(() => RoleList, (roleList) => roleList.role_id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: RoleList;

  @ManyToOne(() => Admin, (admin) => admin.admin_id, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;
}
