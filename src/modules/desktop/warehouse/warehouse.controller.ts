import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Body,
  Param,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WarehouseService } from './warehouse.service';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@ApiTags('Warehouse Endpoint')
@Controller('desktop/warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get()
  @ApiOperation({ summary: 'Get all warehouses' })
  async getAllWarehouses() {
    return this.warehouseService.getAllWarehouses();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Créer un entrepôt',
    type: CreateWarehouseDto,
  })
  async createWarehouse(
    @Body() body: CreateWarehouseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('File received:', file);
    console.log('Body received:', body);
    return this.warehouseService.createWarehouse(body, file);
  }

  @Patch(':id')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Mettre à jour un entrepôt',
    type: UpdateWarehouseDto,
  })
  async updateWarehouse(
    @Param('id') id: string,
    @Body() body: UpdateWarehouseDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    console.log('File received for update:', file);
    console.log('Body received for update:', body);
    console.log('Warehouse ID:', id);
    return this.warehouseService.updateWarehouse(id, body, file);
  }
}
