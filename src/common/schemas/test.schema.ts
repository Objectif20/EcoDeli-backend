import { Schema, Document } from 'mongoose';

// Schema MongoDB pour tester la connexion

export interface Test extends Document {
  age: number;
  name: string;
}

export const TestSchema = new Schema<Test>({
  age: { type: Number, required: true },
  name: { type: String, required: true },
}, {collection: 'test'});


