import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';


// Table roles_list

// Correspond à l'ensemble des rôles disponibles pour les admins

@Entity({name : 'roles_list'})
export class RoleList {

    @PrimaryGeneratedColumn("uuid")
    role_id: string;

    @Column({ length: 255 })
    role_name: string;
}
