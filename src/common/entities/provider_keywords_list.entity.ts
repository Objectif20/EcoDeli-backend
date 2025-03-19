import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { ProviderKeywords } from "./provider_keyword.entity";

@Entity({ name: 'provider_keywords_list' })
export class ProviderKeywordsList {
    @PrimaryGeneratedColumn("uuid")
    provider_keyword_id: string;

    @Column({ unique: true, length: 255 })
    keyword: string;

    @OneToMany(() => ProviderKeywords, keyword => keyword.keywordList)
    keywords: ProviderKeywords[];
}
