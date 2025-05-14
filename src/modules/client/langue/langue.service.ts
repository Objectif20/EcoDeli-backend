import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Languages } from 'src/common/entities/languages.entity';
import { Users } from 'src/common/entities/user.entity';
import { MinioService } from 'src/common/services/file/minio.service';
import { Repository } from 'typeorm';

@Injectable()
export class LanguageService {
    constructor(
    @InjectRepository(Users) 
    private userRepository: Repository<Users>,
    @InjectRepository(Languages)
    private readonly languageRepository: Repository<Languages>,
    private readonly minioService: MinioService,
        ) {}
    


    async changeLanguage(user_id: string, language_id: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { user_id } });
        if (!user) throw new NotFoundException('Utilisateur non trouvé');
        user.language = { language_id } as any;
        await this.userRepository.save(user);
    }

    async getDefaultLanguage(iso_code : string): Promise<any> {

        const language = await this.languageRepository.findOneBy({ iso_code : iso_code });
        if (!language) {
          const defaultLanguage = await this.languageRepository.findOneBy({ iso_code : 'fr' });
            if (!defaultLanguage) {
                throw new NotFoundException('Langue par défaut non trouvée');
                }
            const defaultFileName = `${defaultLanguage.iso_code}.json`;
            try {
                const fileBuffer = await this.minioService.downloadFileFromBucket('languages', defaultFileName);
                const jsonContent = JSON.parse(fileBuffer.toString('utf-8'));
                return jsonContent;
            }
            catch (error) {
                console.error('Erreur lors de la récupération de la langue par défaut (fr.json) :', error);
                throw new Error('Impossible de récupérer ou de parser le fichier fr.json.');
            }
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
      }}
