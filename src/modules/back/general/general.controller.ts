import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeneralService } from './general.service';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { Contracts } from './type';


@Controller('admin/general')
export class GeneralController {
  constructor(private readonly generalService: GeneralService) {}

  @Get('contracts')
    async getContract(
        @Query('type') type: string,
        @Query('page') page: number = 1,
        @Query('q') q: string = '',
    ) : Promise<{data : Contracts[], total: number}> {
        return this.generalService.getContracts(type, page, q);
    }

  
}
