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

    if (createLanguageDto.active === undefined) {
      language.active = true;
    } else {
      if (createLanguageDto.active === 'true') {
        language.active = true;
      } else {
        language.active = false;
      }
    }

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
    if (updateLanguageDto.active === undefined) {
      language.active = true;
    } else {
      if (updateLanguageDto.active === 'true') {
        language.active = true;
      } else {
        language.active = false;
      }
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

  async getDefaultLanguage(id : string): Promise<any> {

    const language = await this.languagesRepository.findOneBy({ language_id : id });
    if (!language) {
      throw new Error('Language not found');
    }
    try {
      const defaultFileName = `${language.iso_code}.json`;
      const fileBuffer = await this.minioService.downloadFileFromBucket('languages', defaultFileName);
      const jsonContent = JSON.parse(fileBuffer.toString('utf-8'));
      return jsonContent;
    } catch (error) {
      console.error('Erreur lors de la récupération de la langue par défaut (fr.json) :', error);
      throw new Error('Impossible de récupérer ou de parser le fichier fr.json.');
    }
  }

  async getFrenchLanguage(): Promise<any> {
    const language = await this.languagesRepository.findOneBy({ iso_code: 'fr' });
    if (!language) {
      throw new Error('Language not found');
    }
    try {
      const defaultFileName = `${language.iso_code}.json`;
      const fileBuffer = await this.minioService.downloadFileFromBucket('languages', defaultFileName);
      const jsonContent = JSON.parse(fileBuffer.toString('utf-8'));
      return jsonContent;
    } catch (error) {
      console.error('Erreur lors de la récupération de la langue par défaut (fr.json) :', error);
      throw new Error('Impossible de récupérer ou de parser le fichier fr.json.');
    }
  }

  private async uploadFile(file: Express.Multer.File, fileName: string): Promise<void> {
    const upload = await this.minioService.uploadFileToBucket('languages', fileName, file);
    if (!upload) {
      throw new Error('Error uploading file');
    }
  }
}
