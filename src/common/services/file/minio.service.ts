// minio.service.ts
import { Injectable } from '@nestjs/common';
import { BucketItem } from 'minio';
import  MinioConfigService  from 'src/config/minio.config';

@Injectable()
export class MinioService {
  constructor(private readonly minioConfigService: MinioConfigService) {}

  async listBuckets() {
    try {
      const minioClient = await this.minioConfigService.createMinioClient();
      const buckets = await minioClient.listBuckets();
      console.log('Liste des buckets :', buckets);
      return buckets;
    } catch (error) {
      console.error('Erreur lors de la récupération des buckets:', error);
      throw error;
    }
  }

  async listObjectsInBucket(bucketName: string) {
    try {
      const minioClient = await this.minioConfigService.createMinioClient();
      const objects: BucketItem[] = [];
      const stream = minioClient.listObjectsV2(bucketName);
      
      stream.on('data', (obj) => {
        objects.push(obj);
      });

      return new Promise<any[]>((resolve, reject) => {
        stream.on('end', () => resolve(objects));
        stream.on('error', reject);
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des objets:', error);
      throw error;
    }
  }
}
