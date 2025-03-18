import { Entity, ManyToOne, JoinColumn, PrimaryColumn } from "typeorm";
import { ServicesList } from "./services_list.entity";
import { Providers } from "./provider.entity";

@Entity({ name: 'services' })
export class Services {
    @PrimaryColumn("uuid")
    service_id: string;

    @PrimaryColumn("uuid")
    provider_id: string;

    @ManyToOne(() => ServicesList, serviceList => serviceList.services)
    @JoinColumn({ name: "service_id" })
    serviceList: ServicesList;

    @ManyToOne(() => Providers, provider => provider.services)
    @JoinColumn({ name: "provider_id" })
    provider: Providers;
}
