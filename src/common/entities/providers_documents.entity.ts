import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import { Providers } from "./provider.entity";

@Entity({ name: 'provider_documents' })
export class ProviderDocuments {
    @PrimaryGeneratedColumn("uuid")
    provider_documents_id: string;

    @Column({ length: 255 })
    name: string;

    @Column({ type: "text", nullable: true })
    description: string;

    @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
    submission_date: Date;

    @Column("text")
    provider_document_url: string;

    @ManyToOne(() => Providers, provider => provider.documents)
    @JoinColumn({ name: "provider_id" })
    provider: Providers;
}
