import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MinioService } from 'src/common/services/file/minio.service';
import { Warehouse } from 'src/common/entities/warehouses.entity';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    private readonly minioService: MinioService,
  ) {}

  async getAllWarehouses() {
    const warehouses = await this.warehouseRepository.find();
    for (const warehouse of warehouses) {
      if (warehouse.photo) {
        warehouse.photo = await this.minioService.generateImageUrl('warehouse', warehouse.photo);
      }

      if (warehouse.coordinates) {
        warehouse.coordinates = warehouse.coordinates.coordinates.map(String);
      }

      if (warehouse.capacity) {
        warehouse.capacity = Number(warehouse.capacity);
      }
    }

    console.log('Warehouses fetched:', warehouses);

    return warehouses;
  }

  private async fetchCoordinates(city: string, address: string, postalCode: string) {
    try {
      const query = `${address}, ${postalCode}, ${city}`;
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'EcoDeli/1.0 (contact.ecodeli@gmail.com)',
        },
      });

      if (response.data && response.data.length > 0) {
        const { lon, lat } = response.data[0];
        return [parseFloat(lon), parseFloat(lat)];
      } else {
        throw new Error('Unable to fetch coordinates');
      }
    } catch (error) {
      throw new Error('Failed to fetch coordinates from Nominatim');
    }
  }

  async createWarehouse(data: CreateWarehouseDto, file?: Express.Multer.File) {
    let photoName: string | null = null;

    if (file) {
      const uuidName = `${uuidv4()}-${file.originalname}`;
      const uploaded = await this.minioService.uploadFileToBucket('warehouse', uuidName, file);
      if (!uploaded) throw new Error("Erreur d'upload MinIO");
      photoName = uuidName;
    }

    const coordinates = await this.fetchCoordinates(data.city, data.address, data.postal_code);

    const warehouse = this.warehouseRepository.create({
      ...data,
      coordinates: {
        type: 'Point',
        coordinates,
      },
      ...(photoName && { photo: photoName }),
      capacity: Number(data.capacity),
    });

    return await this.warehouseRepository.save(warehouse);
  }

  async updateWarehouse(id: string, updateData: UpdateWarehouseDto, file?: Express.Multer.File) {
    const warehouse = await this.warehouseRepository.findOne({ where: { warehouse_id: id } });
    if (!warehouse) throw new Error('Warehouse not found');

    let photoName: string | null = null;
    if (file) {
      if (warehouse.photo) {
        await this.minioService.deleteFileFromBucket('warehouse', warehouse.photo);
      }

      const uuidName = `${uuidv4()}-${file.originalname}`;
      const uploaded = await this.minioService.uploadFileToBucket('warehouse', uuidName, file);
      if (!uploaded) throw new Error("Erreur d'upload MinIO");
      photoName = uuidName;
    }

    let coordinates = warehouse.coordinates.coordinates;

    if (updateData.city || updateData.address || updateData.postal_code) {
      const city = updateData.city ?? warehouse.city;
      const address = updateData.address ?? warehouse.address;
      const postalCode = updateData.postal_code ?? warehouse.postal_code;

      coordinates = await this.fetchCoordinates(city, address, postalCode);
    }

    if (updateData.capacity) {
      updateData.capacity = String(updateData.capacity);
    }

    const updatedWarehouse = Object.assign(warehouse, updateData, {
      coordinates: { type: 'Point', coordinates },
      ...(photoName && { photo: photoName }),
    });

    return await this.warehouseRepository.save(updatedWarehouse);
  }
}
