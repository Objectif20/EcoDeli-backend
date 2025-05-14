import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguageService } from './langue.service';
import { LanguageController } from './langue.controller';
import { Users } from 'src/common/entities/user.entity';
import { Languages } from 'src/common/entities/languages.entity';
import { SharedModule } from 'src/common/shared/shared.module';

@Module({
    imports: [TypeOrmModule.forFeature([Users, Languages]),
        SharedModule,],
    providers: [LanguageService],
    controllers: [LanguageController],
})
export class LanguageModule {}
