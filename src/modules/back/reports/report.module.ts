import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Report } from 'src/common/entities/report.entity';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';

@Module({
    imports: [
        TypeOrmModule.forFeature([Report])
    ],
    providers: [ReportService],
    controllers: [ReportController],
    exports: [TypeOrmModule],
})
export class ReportModule { }
