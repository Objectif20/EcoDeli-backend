import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { AdminMailService } from './mail.service';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MailSchema } from 'src/common/schemas/mail.schema';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Users } from 'src/common/entities/user.entity';
import { Admin } from 'src/common/entities/admin.entity';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Mail', schema: MailSchema }]),
        TypeOrmModule.forFeature([Users, Admin]),
        JwtModule.register({}),
        SharedModule
    ],
    providers: [AdminMailService, JwtService],
    controllers: [MailController],
    exports: [JwtModule],
})
export class MailModule { }