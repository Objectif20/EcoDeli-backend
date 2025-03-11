import { Injectable } from '@nestjs/common';
import { SecretsService } from '../common/services/secrets.service';
import { Client } from 'minio';

@Injectable()
export default class MinioConfigService {
  private minioClient: Client;

  constructor(private secretsService: SecretsService) {}

  async createMinioClient() {
    const minioEndpoint = await this.secretsService.loadSecret('MINIO_ENDPOINT');
    const minioAccessKey = await this.secretsService.loadSecret('MINIO_ACCESS_KEY');
    const minioSecretKey = await this.secretsService.loadSecret('MINIO_SECRET_KEY');

    if (!minioEndpoint || !minioAccessKey || !minioSecretKey) {
      throw new Error('Impossible de récupérer les secrets MinIO.');
    }

    this.minioClient = new Client({
      endPoint: minioEndpoint,
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true' || false,
      accessKey: minioAccessKey,
      secretKey: minioSecretKey,
    });

    if(this.minioClient) {
      console.log('Client MinIO créé avec succès.');
    }

    return this.minioClient;
  }

  getClient(): Client {
    return this.minioClient;
  }

  async testConnection(): Promise<void> {
    try {
      await this.createMinioClient();
      const buckets = await this.minioClient.listBuckets();
      console.log('Connexion réussie à MinIO. Buckets disponibles:', buckets);
    } catch (error) {
      console.error('Erreur de connexion à MinIO:', error);
    }
  }
}
