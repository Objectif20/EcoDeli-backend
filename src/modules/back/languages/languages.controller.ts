import { Controller, Post, Body, UseInterceptors, UploadedFile, Param, Put, Get, Query, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/languages.dto';
import { Languages } from 'src/common/entities/languages.entity';
import { AdminRole } from 'src/common/decorator/admin-role.decorator';
import { AdminJwtGuard } from 'src/common/guards/admin-jwt.guard';
import { AdminRoleGuard } from 'src/common/guards/admin-role.guard';

@Controller('admin/languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

    @Post()
    @AdminRole('LANGUAGE')
    @UseGuards(AdminJwtGuard, AdminRoleGuard)
    @UseInterceptors(FileInterceptor('languages'))
    async createLanguage(
        @Body() createLanguageDto: CreateLanguageDto,
        @UploadedFile() file: Express.Multer.File,
    ) : Promise<Languages> {
        return this.languagesService.createLanguage(createLanguageDto, file);
    }

  @Put(':id')
  @AdminRole('LANGUAGE')
  @UseGuards(AdminJwtGuard, AdminRoleGuard)
  @UseInterceptors(FileInterceptor('languages'))
  async updateLanguage(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
    @UploadedFile() file?: Express.Multer.File,
  ) : Promise<Languages> {
    return this.languagesService.updateLanguage(id, updateLanguageDto, file);
  }

  @Get()
  @UseGuards(AdminJwtGuard)
  async getAllLanguages(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) : Promise<{ data: (Languages & { fileUrl: string })[], meta: { total: number, page: number, lastPage: number } }> {
    return this.languagesService.getAllLanguages(page, limit);
  }
}
