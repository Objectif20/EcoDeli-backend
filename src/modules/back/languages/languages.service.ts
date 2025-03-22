import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLanguageDto, UpdateLanguageDto } from './dto/languages.dto';
import { Languages } from 'src/common/entities/languages.entity';
import { MinioService } from 'src/common/services/file/minio.service';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Languages)
    private readonly languagesRepository: Repository<Languages>,
    private readonly minioService: MinioService,
  ) {}

  async createLanguage(createLanguageDto: CreateLanguageDto, file: Express.Multer.File): Promise<Languages> {
    const language = new Languages();
    language.language_name = createLanguageDto.language_name;
    language.iso_code = createLanguageDto.iso_code;
    language.active = createLanguageDto.active;

    const fileName = `${language.iso_code}.json`;
    await this.uploadFile(file, fileName);

    return this.languagesRepository.save(language);
  }

  async updateLanguage(id: string, updateLanguageDto: UpdateLanguageDto, file?: Express.Multer.File): Promise<Languages> {
    const language = await this.languagesRepository.findOneBy({ language_id: id });
    if (!language) {
      throw new Error('Language not found');
    }

    if (updateLanguageDto.language_name) {
      language.language_name = updateLanguageDto.language_name;
    }
    if (updateLanguageDto.iso_code) {
      language.iso_code = updateLanguageDto.iso_code;
    }
    if (updateLanguageDto.active !== undefined) {
      language.active = updateLanguageDto.active;
    }

    if (file) {
      const oldFileName = `${language.iso_code}.json`;
      await this.minioService.deleteFileFromBucket('languages', oldFileName);
      await this.uploadFile(file, oldFileName);
    }

    return this.languagesRepository.save(language);
  }

  async getAllLanguages(page: number, limit: number): Promise<{ data: (Languages & { fileUrl: string })[], meta: { total: number, page: number, lastPage: number } }> {
    const [languages, total] = await this.languagesRepository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });

    const languagesWithUrls = await Promise.all(
      languages.map(async (language) => {
        const fileName = `${language.iso_code}.json`;
        const fileUrl = await this.minioService.generateImageUrl('languages', fileName);
        return { ...language, fileUrl };
      })
    );

    const lastPage = Math.ceil(total / limit);

    return {
      data: languagesWithUrls,
      meta: {
        total,
        page,
        lastPage,
      },
    };
  }

  private async uploadFile(file: Express.Multer.File, fileName: string): Promise<void> {
    const upload = await this.minioService.uploadFileToBucket('languages', fileName, file);
    if (!upload) {
      throw new Error('Error uploading file');
    }
  }
}
