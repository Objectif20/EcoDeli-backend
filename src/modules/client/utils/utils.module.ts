import { Module } from '@nestjs/common';
import { GuardsModule } from 'src/common/guards/guards.module';
import { SharedModule } from 'src/common/shared/shared.module';
import { UtilsService } from './utils.service';
import { UtilsController } from './utils.controller';

@Module({
  imports: [
    SharedModule,
    GuardsModule
  ],
  providers: [UtilsService],
  controllers: [UtilsController],
})
export class UtilsModule {}
