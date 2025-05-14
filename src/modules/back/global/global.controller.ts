import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBody, getSchemaPath, ApiExtraModels } from '@nestjs/swagger';
import { GlobalService } from './global.service';
import { TestDto } from './dto/test.dto';
import { RoleList } from 'src/common/entities/role_list.entity';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import axios from 'axios';
import { Response } from 'express';


@ApiTags('Global Administration')
@ApiExtraModels(TestDto)
@Controller('admin/global')
export class GlobalController {
  constructor(private readonly globalService: GlobalService) {}

  // API : GET /admin/global/test
  @Get('test')
  @ApiOperation({
    summary: 'Get a test message',
    operationId: 'getTestMessage',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a test message.',
    type: String,
    example: 'Hello, World!',
  })
  getTestMessage(): string {
    return this.globalService.getHello();
  }

  // API : GET /admin/global/mongodb
  @Get('mongodb')
  @ApiOperation({
    summary: 'Get test data from MongoDB',
    operationId: 'getTestDataFromMongoDB',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns test data from MongoDB.',
    schema: {
      type: 'array',
      items: { $ref: getSchemaPath(TestDto) },
    },
  })
  async getTestData(): Promise<TestDto[]> {
    return this.globalService.mongoDbTest();
  }

  // API : GET /admin/global/postgres
  @Get('postgres')
  @ApiOperation({
    summary: 'Get test data from PostgreSQL',
    operationId: 'getTestDataFromPostgres',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns test data from PostgreSQL.',
    type: RoleList,
    example: { role_id: '1', role_name: 'Super Admin' },
  })
  async getPostgresData(): Promise<RoleList> {
    await this.globalService.postgresTest();
    return { role_id: '1', role_name: 'Super Admin' };
  }

  // API : POST /admin/global/email
  @Post('email')
  @ApiOperation({
    summary: 'Send a test email',
    operationId: 'sendTestEmail',
  })
  @ApiBody({
    description: 'Email address to send the test email to.',
    type: String,
    examples: {
      example1: {
        summary: 'A valid email address',
        value: 'test@example.com',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Email sent successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid email address.',
  })
  async sendEmail(@Body('to') to: string): Promise<void> {
    return this.globalService.sendEmail(to);
  }
}
