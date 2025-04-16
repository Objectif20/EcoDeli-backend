import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorialService } from './tuto.service';
import { TutorialController } from './tuto.controller';
import { Users } from 'src/common/entities/user.entity';
import { JwtService } from 'src/config/jwt.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [TypeOrmModule.forFeature([Users]), JwtModule.register({})],
    providers: [TutorialService, JwtService],
    controllers: [TutorialController],
})
export class TutorialModule {}
