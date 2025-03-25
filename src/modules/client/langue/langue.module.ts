import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguageService } from './langue.service';
import { LanguageController } from './langue.controller';
import { Users } from 'src/common/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Users])],
    providers: [LanguageService],
    controllers: [LanguageController],
})
export class LanguageModule {}
