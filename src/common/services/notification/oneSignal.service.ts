import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as OneSignal from '@onesignal/node-onesignal';
import { OneSignalDevice } from 'src/common/entities/onesignal-device.entity';
import { Users } from 'src/common/entities/user.entity';

@Injectable()
export class OneSignalService {
  constructor(
    @Inject('ONESIGNAL_WEB_CLIENT')
    private readonly webClient: OneSignal.DefaultApi,

    @Inject('ONESIGNAL_MOBILE_CLIENT')
    private readonly mobileClient: OneSignal.DefaultApi,

    @InjectRepository(OneSignalDevice)
    private readonly deviceRepository: Repository<OneSignalDevice>,

    @InjectRepository(Users)
    private readonly userRepository: Repository<Users>,
  ) {}

  async sendNotification(
    userId: string,
    title: string,
    content: string,
  ) {
    if (!title || !content) {
      throw new Error('Le titre et le contenu sont requis pour la notification.');
    }

    const devices = await this.deviceRepository.find({
      where: { user: { user_id: userId } },
    });

    if (!devices.length) {
      console.warn(`⚠️ Aucun device trouvé pour l'utilisateur ${userId}.`);
      return [];
    }

    const groupedByPlatform = devices.reduce((acc, device) => {
      const platform = device.platform || 'unknown';
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(device.player_id);
      return acc;
    }, {} as Record<string, string[]>);

    const results: Array<
      { platform: string; success: true; log: OneSignal.CreateNotificationSuccessResponse } |
      { platform: string; success: false; error: any }
    > = [];

    for (const [platform, playerIds] of Object.entries(groupedByPlatform)) {
      let appId: string | undefined;
      let client: OneSignal.DefaultApi;

      if (platform === 'web') {
        appId = process.env.ONESIGNAL_APP_ID_WEB;
        client = this.webClient;
      } else if (platform === 'mobile') {
        appId = process.env.ONESIGNAL_APP_ID_ANDROID;
        client = this.mobileClient;
      } else {
        console.warn(`⚠️ Plateforme inconnue: ${platform}, on skip.`);
        continue;
      }

      if (!appId) {
        console.warn(`⚠️ appId manquant pour la plateforme: ${platform}, on skip.`);
        continue;
      }

      const notification = new OneSignal.Notification();
      notification.app_id = appId;
      notification.include_subscription_ids = playerIds;
      notification.headings = { en: title, fr: title };
      notification.contents = { en: content, fr: content };

      try {
        const log = await client.createNotification(notification);
        console.log(`✅ Notification envoyée sur ${platform}.`);
        results.push({ platform, success: true, log });
      } catch (error) {
        let errorDetails: any = error;
        if (error?.body?.json) {
          try {
            errorDetails = await error.body.json();
          } catch {
            errorDetails = await error.body.text();
          }
        }
        console.error(`❌ Erreur envoi ${platform}:`, errorDetails);
        results.push({ platform, success: false, error: errorDetails });
      }
    }

    return results;
  }

  async registerDevice(
    userId: string,
    playerId: string,
    platform: string = 'web',
  ): Promise<OneSignalDevice> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new Error('Utilisateur introuvable');
    }

    const existing = await this.deviceRepository.findOne({
      where: { user: { user_id: userId }, player_id: playerId },
    });

    if (existing) {
      return existing;
    }

    const device = this.deviceRepository.create({
      player_id: playerId,
      user,
      platform,
    });

    return await this.deviceRepository.save(device);
  }

  async getPlayerIdsForUser(
    userId: string,
  ): Promise<{ player_id: string; platform: string | null }[]> {
    const devices = await this.deviceRepository.find({
      where: { user: { user_id: userId } },
    });

    return devices.map((d) => ({
      player_id: d.player_id,
      platform: d.platform ?? null,
    }));
  }
}
