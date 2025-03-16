import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { GlobalService } from './global.service';
import { Test } from 'src/common/schemas/test.schema';
import { RoleList } from 'src/common/entities/role_list.entity';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';

@Controller('admin/global') 
export class GlobalController {
  constructor(private readonly globalService: GlobalService) {}

  // API : GET /admin/global/test
  @Get('test')
  @AdminRole('TICKET')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  getTestMessage(): string {
    return this.globalService.getHello(); 
  }

    // API : GET /admin/global/mongodb
  @Get('mongodb')
  async getTestData(): Promise<Test[]> {
    return this.globalService.mongoDbTest();
  }

    // API : GET /admin/global/postgres
  @Get('postgres')
    async getPostgresData(): Promise<RoleList> {
      this.globalService.postgresTest();
        return { role_id: "1", role_name: 'Super Admin' };
    }

    // API : POST /admin/global/email
  @Post('email')
  async sendEmail(@Body('to') to: string): Promise<void> {
    return this.globalService.sendEmail(to);
  }

}
