import { Module } from '@nestjs/common';
import { BoxService } from './boxes.service';


@Module({
    imports : [],
    providers : [BoxService],
    exports : [BoxService],



})
export class DatasetModule {}