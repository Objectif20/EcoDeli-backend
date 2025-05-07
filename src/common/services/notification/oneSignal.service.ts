import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as OneSignal from '@onesignal/node-onesignal';
import { OneSignalDevice } from 'src/common/entities/onesignal-device.entity';
import { Users } from 'src/common/entities/user.entity';

@Injectable()
export class OneSignalService {
  constructor(
    @Inject('ONESIGNAL_CLIENT')
    private readonly client: OneSignal.DefaultApi,

    @InjectRepository(OneSignalDevice)
    private readonly deviceRepository: Repository<OneSignalDevice>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  async sendNotification(subscriptionIds: string[], title: string, content: string) {
    const appId = process.env.APP_ONE_SIGNAL_ID;
    if (!appId) {
      throw new Error('ONESIGNAL_APP_ID manquant dans les variables d\'environnement.');
    }
  
    const notification = new OneSignal.Notification();
  
    notification.app_id = appId;
    notification.include_subscription_ids = subscriptionIds; 
    notification.headings = { en: title };
    notification.contents = { en: content };
  
    try {
      const log = await this.client.createNotification(notification);
      return { log }; 
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la notification :', error?.body || error);
      throw error;
    }
  }

  async registerDevice(userId: string, playerId: string): Promise<OneSignalDevice> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const existing = await this.deviceRepository.findOne({
      where: {
        user: { user_id: userId },
        player_id: playerId,
      },
    });

    if (existing) {
      return existing; 
    }

    const device = this.deviceRepository.create({
      player_id: playerId,
      user,
    });

    return await this.deviceRepository.save(device);
  }


  async getPlayerIdsForUser(userId: string): Promise<string[]> {
    const devices = await this.deviceRepository.find({
      where: { user: { user_id: userId } },
    });

    return devices.map((d) => d.player_id);
  }
}
