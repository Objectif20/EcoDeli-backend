import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GlobalService } from './global.service';
import { GlobalController } from './global.controller';
import { TestSchema } from 'src/common/schemas/test.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleList } from 'src/common/entities/role_list.entity';
import { JwtModule } from '@nestjs/jwt';
import { GuardsModule } from 'src/common/guards/guards.module';
import { Admin } from 'typeorm';
import { Role } from 'src/common/entities/roles.entity';
import { SharedModule } from 'src/common/shared/shared.module';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([{ name: 'Test', schema: TestSchema }]),
    JwtModule.register({}),
    GuardsModule
  ],
  providers: [GlobalService],
  controllers: [GlobalController],
})
export class GlobalModule {}
