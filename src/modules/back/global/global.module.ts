import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GlobalService } from './global.service';
import { GlobalController } from './global.controller';
import { TestSchema } from 'src/common/schemas/test.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleList } from 'src/common/entities/role_list.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Test', schema: TestSchema }]),
    TypeOrmModule.forFeature([RoleList])
  ],
  providers: [GlobalService],
  controllers: [GlobalController],
})
export class GlobalModule {}
