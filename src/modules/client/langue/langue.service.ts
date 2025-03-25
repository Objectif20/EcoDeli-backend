import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/common/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LanguageService {
    constructor(@InjectRepository(Users) private userRepository: Repository<Users>) {}

    async changeLanguage(user_id: string, language_id: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { user_id } });
        if (!user) throw new NotFoundException('Utilisateur non trouvé');
        user.language = { language_id } as any;
        await this.userRepository.save(user);
    }
}
