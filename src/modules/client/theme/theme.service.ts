import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/common/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class ThemeService {
    constructor(@InjectRepository(Users) private userRepository: Repository<Users>) {}

    async changeTheme(user_id: string, theme_id: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { user_id } });
        if (!user) throw new NotFoundException('Utilisateur non trouvé');
        user.theme = { theme_id } as any;
        await this.userRepository.save(user);
    }
}
