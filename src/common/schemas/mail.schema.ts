import { Schema, Document } from 'mongoose';

// Schema MongoDB pour les mails

export interface Mail extends Document {
    admin_id: string;
    subject: string;
    message: string;
    date: Date;
    send: boolean;
    newsletter: boolean;
    profile : string[];
}

export const MailSchema = new Schema<Mail>({
    admin_id: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    date: { type: Date, required: true },
    send: { type: Boolean, required: true },
    newsletter: { type: Boolean, required: true },
    profile: { type: [String], required: true },
}, {collection: 'mail'});


