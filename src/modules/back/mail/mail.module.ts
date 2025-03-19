import { Module } from '@nestjs/common';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { MongooseModule } from '@nestjs/mongoose';
import { MailSchema } from 'src/common/schemas/mail.schema';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: 'Mail', schema: MailSchema }]),
        JwtModule.register({}),
        SharedModule
    ],
    providers: [MailService, JwtService],
    controllers: [MailController],
    exports: [JwtModule],
})
export class MailModule { }