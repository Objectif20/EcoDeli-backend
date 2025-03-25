import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThemeService } from './theme.service';
import { ThemeController } from './theme.controller';
import { Users } from 'src/common/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Users])],
    providers: [ThemeService],
    controllers: [ThemeController],
})
export class ThemeModule {}
