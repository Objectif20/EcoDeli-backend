import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Warehouse } from 'src/common/entities/warehouses.entity';
import { MinioService } from 'src/common/services/file/minio.service';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    private readonly minioService: MinioService
  ) {}

  async getAllWarehouses() {
    const warehouses = await this.warehouseRepository.find();
    for (const warehouse of warehouses) {
      if (warehouse.photo) {
        warehouse.photo = await this.minioService.generateImageUrl('warehouse', warehouse.photo);
      }
    }
    return warehouses;
  }

  async createWarehouse(data: any, file?: Express.Multer.File) {
    let photoName: string | null = null;

    if (file) {
      const uuidName = `${uuidv4()}-${file.originalname}`;
      const uploaded = await this.minioService.uploadFileToBucket('warehouse', uuidName, file);
      if (!uploaded) throw new Error("Erreur d'upload MinIO");
      photoName = uuidName;
    }

    const warehouse = this.warehouseRepository.create({
      ...data,
      photo: photoName ?? null,
    });

    return await this.warehouseRepository.save(warehouse);
  }

  async updateWarehouse(id: string, updateData: any, file?: Express.Multer.File) {
    const warehouse = await this.warehouseRepository.findOne({ where: { warehouse_id: id } });
    if (!warehouse) throw new Error('Warehouse not found');

    if (file) {
      const uuidName = `${uuidv4()}-${file.originalname}`;
      const uploaded = await this.minioService.uploadFileToBucket('warehouse', uuidName, file);
      if (!uploaded) throw new Error("Erreur d'upload MinIO");
      updateData.photo = uuidName;
    }

    const updatedWarehouse = Object.assign(warehouse, updateData);
    return await this.warehouseRepository.save(updatedWarehouse);
  }
}
