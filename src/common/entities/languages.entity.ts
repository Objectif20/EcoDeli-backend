import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({name : 'languages'})
export class Languages {

    @PrimaryGeneratedColumn("uuid")
    language_id: string;

    @Column({ length: 255 })
    language_name: string;

    @Column({ length: 10 })
    iso_code: string;

    @Column({ default: true })
    active: boolean;


}