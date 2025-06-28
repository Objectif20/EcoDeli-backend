import { Controller, Post, Body, UseInterceptors, UploadedFile, Param, Put, Get, Query, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/languages.dto';
import { Languages } from 'src/common/entities/languages.entity';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';

@ApiTags('Language Management')
@Controller('admin/languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Post()
  @AdminRole('LANGUAGE')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @UseInterceptors(FileInterceptor('languages'))
  @ApiOperation({
    summary: 'Create a new Language',
    operationId: 'createLanguage',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Language data and file',
    type: CreateLanguageDto,
  })
  @ApiResponse({ status: 201, description: 'Language created successfully' })
  async createLanguage(
    @Body() createLanguageDto: CreateLanguageDto,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Languages> {
    return this.languagesService.createLanguage(createLanguageDto, file);
  }

  @Put(':id')
  @AdminRole('LANGUAGE')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @UseInterceptors(FileInterceptor('languages'))
  @ApiOperation({
    summary: 'Update an existing Language',
    operationId: 'updateLanguage',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'The ID of the language' })
  @ApiBody({
    description: 'Updated language data and optional file',
    type: UpdateLanguageDto,
  })
  @ApiResponse({ status: 200, description: 'Language updated successfully' })
  async updateLanguage(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<Languages> {
    return this.languagesService.updateLanguage(id, updateLanguageDto, file);
  }

  @Get()
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get All Languages',
    operationId: 'getAllLanguages',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of items per page' })
  @ApiResponse({ status: 200, description: 'List of languages retrieved successfully' })
  async getAllLanguages(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ data: (Languages & { fileUrl: string })[], meta: { total: number, page: number, lastPage: number } }> {
    return this.languagesService.getAllLanguages(page, limit);
  }

  @Get(':id/details')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get a Language by ID',
    operationId: 'getLanguageById',
  })
  @ApiParam({ name: 'id', description: 'The ID of the language'
  })
  @ApiResponse({ status: 200, description: 'Language retrieved successfully' })
  async getDetailsLanguageById(@Param('id') id: string): Promise<Languages>
  {
    return this.languagesService.getLanguageById(id);
  }

  @Get("french")
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get the default language',
    operationId: 'getDefaultLanguage',
  })
  @ApiResponse({ status: 200, description: 'Default language retrieved successfully' })
  async getDefaultLanguage(): Promise<any> {
    return this.languagesService.getFrenchLanguage();
  }

  @Get(':id')
  @UseGuards(AdminJwtGuard)
  @ApiOperation({
    summary: 'Get a Language by ID',
    operationId: 'getLanguageById',
  })
  @ApiParam({ name: 'id', description: 'The ID of the language' })
  @ApiResponse({ status: 200, description: 'Language retrieved successfully' })
  async getLanguageById(@Param('id') id: string): Promise<any> {
    return this.languagesService.getDefaultLanguage(id);
  }


}
