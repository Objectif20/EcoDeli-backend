import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { AdminProfileService } from './profile.service';
import { AdminProfileController } from './profile.controller';
import { RoleList } from 'src/common/entities/role_list.entity';
import { Role } from 'src/common/entities/roles.entity';
import { JwtService } from 'src/config/jwt.service';
import { SharedModule } from 'src/common/shared/shared.module';
import { Languages } from 'src/common/entities/languages.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, RoleList, Role, Languages]),
    JwtModule.register({}),
    SharedModule
  ],
  providers: [AdminProfileService, JwtService], 
  controllers: [AdminProfileController], 
  exports: [AdminProfileService, TypeOrmModule, JwtModule],
})
export class AdminProfileModule {}
