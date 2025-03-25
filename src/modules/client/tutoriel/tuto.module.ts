import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TutorialService } from './tuto.service';
import { TutorialController } from './tuto.controller';
import { Users } from 'src/common/entities/user.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Users])],
    providers: [TutorialService],
    controllers: [TutorialController],
})
export class TutorialModule {}
