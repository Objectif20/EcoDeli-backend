import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtService } from 'src/config/jwt.service';
import { Users } from 'src/common/entities/user.entity';
import { Client } from 'src/common/entities/client.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Users, Client]), JwtModule.register({})],
  providers: [AuthService, JwtService],
  controllers: [AuthController],
  exports: [AuthService, TypeOrmModule, JwtModule],
})
export class ClientAuthModule {}
