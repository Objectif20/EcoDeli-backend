import { Injectable } from "@nestjs/common";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { MinioService } from 'src/common/services/file/minio.service';
import { InjectModel } from "@nestjs/mongoose";
import { Model } from 'mongoose';
import { Mail } from "src/common/schemas/mail.schema";

@Injectable()
export class MailService {

    constructor(
        @InjectModel('Mail') private readonly testModel: Model<Mail>,
        private readonly minioService: MinioService,
    ) { }

    async uploadPicture(file: Express.Multer.File): Promise<{ url: string } | { error: string }> {
        const fileExtension = path.extname(file.originalname);
        
        const uniqueFileName = `${uuidv4()}${fileExtension}`;
    
        const upload = await this.minioService.uploadFileToBucket("email", uniqueFileName, file);
    
        if (upload) {
            const url = await this.minioService.generateImageUrl("email", uniqueFileName);
            return { url };
        } else {
            return { error: "Erreur lors de l'upload de l'image" };
        }
    }
    

}