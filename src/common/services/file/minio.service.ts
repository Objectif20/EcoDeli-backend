import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { Client } from 'minio';
import MinioConfigService from 'src/config/minio.config';

@Injectable()
export class MinioService {
  private encryptionKey: string;

  constructor(private readonly minioConfigService: MinioConfigService) {}

  initEncryptionKey(encryptionKey: string): void {
    this.encryptionKey = encryptionKey;
  }

  async uploadFileToBucket(bucketName: string, filePath: string, file: Express.Multer.File): Promise<boolean> {
    try {
      const minioClient: Client = await this.minioConfigService.createMinioClient();
      await minioClient.putObject(bucketName, filePath, file.buffer);
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'upload du fichier:`, error);
      return false;
    }
  }

  async uploadBufferToBucket(bucketName: string, filePath: string, fileBuffer: Buffer): Promise<boolean> {
    try {
      const minioClient: Client = await this.minioConfigService.createMinioClient();
      await minioClient.putObject(bucketName, filePath, fileBuffer);
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'upload du fichier:`, error);
      return false;
    }
  }

  async downloadFileFromBucket(bucketName: string, filePath: string): Promise<Buffer> {
    try {
      const minioClient: Client = await this.minioConfigService.createMinioClient();
      const stream = await minioClient.getObject(bucketName, filePath);
  
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          const fileBuffer = Buffer.concat(chunks);
          resolve(fileBuffer);
        });
        stream.on('error', (err) => {
          console.error('Erreur lors de la lecture du fichier depuis MinIO:', err);
          reject(err);
        });
      });
    } catch (error) {
      console.error(`Erreur lors du téléchargement du fichier depuis MinIO:`, error);
      throw error;
    }
  }

  async uploadEncryptedFileToBucket(bucketName: string, filePath: string, file: Express.Multer.File): Promise<boolean> {
    try {
      const minioClient: Client = await this.minioConfigService.createMinioClient();
      if (!this.encryptionKey) {
        throw new Error('Clé de chiffrement manquante.');
      }
      const encryptedBuffer = this.encryptFile(file.buffer);
      await minioClient.putObject(bucketName, filePath, encryptedBuffer);
      console.log(`Fichier ${file.originalname} chiffré et uploadé dans le bucket ${bucketName} à ${filePath}`);
      return true;
    } catch (error) {
      console.error(`Erreur lors de l'upload du fichier chiffré:`, error);
      return false;
    }
  }

  async generatePresignedUrl(bucketName: string, filePath: string, expiresIn: number = 3600, encrypted: boolean = false): Promise<string> {
    try {
      const minioClient: Client = await this.minioConfigService.createMinioClient();
      const presignedUrl = await minioClient.presignedUrl('GET', bucketName, filePath, expiresIn);
      
      if (encrypted) {
        return `${presignedUrl}&decrypt=true`;
      }
      return presignedUrl;
    } catch (error) {
      console.error(`Erreur lors de la génération de l'URL temporaire:`, error);
      throw error;
    }
  }

  private encryptFile(fileBuffer: Buffer): Buffer {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'utf-8'), iv);
    let encrypted = cipher.update(fileBuffer);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return Buffer.concat([iv, encrypted]);
  }

  private decryptFile(encryptedBuffer: Buffer): Buffer {
    const iv = encryptedBuffer.slice(0, 16);
    const encryptedData = encryptedBuffer.slice(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(this.encryptionKey, 'utf-8'), iv);
    let decrypted = decipher.update(encryptedData);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
  }

  async generateImageUrl(bucketName: string, imageName: string): Promise<string> {
    try {
      const filePath = `${imageName}`;
      
      const minioBaseUrl = process.env.MINIO_ACCESS_URL; 
      const url = `${minioBaseUrl}/api/v1/buckets/${bucketName}/objects/download?preview=true&prefix=${encodeURIComponent(filePath)}&version_id=null`;

      return url;
    } catch (error) {
      console.error(`Erreur lors de la génération de l'URL de l'image:`, error);
      throw error;
    }
  }

  async getDecryptedFile(bucketName: string, filePath: string): Promise<Buffer> {
    try {
      const minioClient: Client = await this.minioConfigService.createMinioClient();
      const stream = await minioClient.getObject(bucketName, filePath);
      
      return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('end', () => {
          const encryptedBuffer = Buffer.concat(chunks);
          const decryptedBuffer = this.decryptFile(encryptedBuffer);
          resolve(decryptedBuffer);
        });
        stream.on('error', reject);
      });
    } catch (error) {
      console.error(`Erreur lors de la récupération du fichier déchiffré:`, error);
      throw error;
    }
  }


  async deleteFileFromBucket(bucketName: string, filePath: string): Promise<boolean> {
    try {
      const minioClient: Client = await this.minioConfigService.createMinioClient();
      await minioClient.removeObject(bucketName, filePath);
      console.log(`Fichier ${filePath} supprimé du bucket ${bucketName}`);
      return true;
    } catch (error) {
      console.error(`Erreur lors de la suppression du fichier:`, error);
      return false;
    }
  }

  async fileExistsInBucket(bucketName: string, filePath: string): Promise<boolean> {
  try {
    const minioClient: Client = await this.minioConfigService.createMinioClient();
    await minioClient.statObject(bucketName, filePath);
    return true;
  } catch (error: any) {
    if (error.code === 'NotFound' || error.message.includes('not found')) {
      return false;
    }
    console.error(`Erreur lors de la vérification de l'existence du fichier:`, error);
    throw error;
  }
}
}
