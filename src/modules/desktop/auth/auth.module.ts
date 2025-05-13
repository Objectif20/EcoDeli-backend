import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RoleList } from 'src/common/entities/role_list.entity';
import { Role } from 'src/common/entities/roles.entity';
import { JwtService } from 'src/config/jwt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, RoleList, Role]),
    JwtModule.register({}),
  ],
  providers: [AuthService, JwtService], 
  controllers: [AuthController], 
  exports: [AuthService, TypeOrmModule, JwtModule],
})
export class AdminAuthModule {}
