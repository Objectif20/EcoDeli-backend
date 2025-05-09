import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { GeneralService } from './general.service';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { Contracts } from './type';


@Controller('admin/general')
export class GeneralController {
  constructor(private readonly generalService: GeneralService) {}

  @Get('contract')
  @UseGuards(AdminJwtGuard)
    async getContract(
        @Query('type') type: string,
        page: number = 1,
    ) : Promise<Contracts[]> {
        return this.generalService.getContracts(type, page);
    }

  
}
