import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { ProviderKeywordsList } from "./provider_keywords_list.entity";
import { ServicesList } from "./services_list.entity";

@Entity({ name: 'provider_keywords' })
export class ProviderKeywords {
    @PrimaryColumn("uuid")
    provider_keyword_id: string;

    @PrimaryColumn("uuid")
    service_id: string;

    @ManyToOne(() => ProviderKeywordsList, keywordList => keywordList.keywords)
    @JoinColumn({ name: "provider_keyword_id" })
    keywordList: ProviderKeywordsList;

    @ManyToOne(() => ServicesList, service => service.keywords)
    @JoinColumn({ name: "service_id" })
    service: ServicesList;
}
