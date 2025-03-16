import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { Role } from 'src/common/entities/roles.entity';
import { RoleList } from 'src/common/entities/role_list.entity';
import { AdminAuthModule } from 'src/modules/back/auth/auth.module';
import { MinioService } from '../services/file/minio.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Role, RoleList]),
    AdminAuthModule, 

  ],
  providers: [
    MinioService
  ],
  exports: [
    TypeOrmModule,
    AdminAuthModule,
    MinioService
  ],
})
export class SharedModule {}
