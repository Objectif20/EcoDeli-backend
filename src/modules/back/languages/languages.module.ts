import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Languages } from 'src/common/entities/languages.entity';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Languages]),
        JwtModule.register({}),
        SharedModule
    ],
    providers: [LanguagesService, JwtService],
    controllers: [LanguagesController],
    exports: [JwtModule],
})
export class LanguagesModule { }