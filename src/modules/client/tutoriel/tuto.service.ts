import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Users } from 'src/common/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class TutorialService {
    constructor(@InjectRepository(Users) private userRepository: Repository<Users>) {}

    async isFirstLogin(user_id: string): Promise<boolean> {
        const user = await this.userRepository.findOne({ where: { user_id } });
        if (!user) throw new NotFoundException('Utilisateur non trouvé');
        return user.tutorial_done;
    }

    async addFirstLogin(user_id: string): Promise<void> {
        const user = await this.userRepository.findOne({ where: { user_id } });
        if (!user) throw new NotFoundException('Utilisateur non trouvé');
        user.tutorial_done = true;
        await this.userRepository.save(user);
    }
}
