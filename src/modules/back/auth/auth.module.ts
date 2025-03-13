import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from 'src/common/entities/admin.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]),
    JwtModule.register({}),
  ],
  providers: [AuthService], 
  controllers: [AuthController], 
  exports: [AuthService],
})
export class AdminAuthModule {}
