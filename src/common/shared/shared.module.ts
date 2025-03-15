import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { Role } from 'src/common/entities/roles.entity';
import { RoleList } from 'src/common/entities/role_list.entity';
import { AdminAuthModule } from 'src/modules/back/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Role, RoleList]),
    AdminAuthModule, 
  ],
  exports: [
    TypeOrmModule,
    AdminAuthModule,
  ],
})
export class SharedModule {}
