import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { Users } from "./user.entity";

@Entity({ name: 'themes' })
export class Themes {
    @PrimaryGeneratedColumn()
    theme_id: number;

    @Column({ unique: true, length: 20 })
    name: string;

    @OneToMany(() => Users, user => user.theme)
    users: Users[];
}
