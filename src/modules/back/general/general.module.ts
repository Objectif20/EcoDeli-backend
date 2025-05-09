import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SharedModule } from 'src/common/shared/shared.module';
import { JwtService } from 'src/config/jwt.service';
import { GeneralService } from './general.service';
import { GeneralController } from './general.controller';

@Module({
    imports: [
        JwtModule.register({}),
        SharedModule
    ],
    providers: [GeneralService, JwtService],
    controllers: [GeneralController],
    exports: [JwtModule],
})
export class GeneralModule { }