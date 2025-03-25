import { Injectable } from '@nestjs/common';
import { SecretsService } from '../common/services/secrets.service';
import * as OneSignal from '@onesignal/node-onesignal';

@Injectable()
export class OneSignalConfigService {
  private client: OneSignal.DefaultApi;
  private initialized: boolean = false;

  constructor(private readonly secretsService: SecretsService) {}

  async initialize() {
    if (this.initialized) return; 
    const userAuthKey = await this.secretsService.loadSecret('ONESIGNAL_USER_AUTH_KEY');
    const restApiKey = await this.secretsService.loadSecret('ONESIGNAL_REST_API_KEY');

    if (!userAuthKey || !restApiKey) {
      throw new Error('Les clés OneSignal sont manquantes.');
    }

    const configuration = OneSignal.createConfiguration({
      userAuthKey,
      restApiKey,
    });

    this.client = new OneSignal.DefaultApi(configuration);
    this.initialized = true;
  }

  async getClient(): Promise<OneSignal.DefaultApi> {
    if (!this.initialized) {
      await this.initialize(); 
    }
    return this.client;
  }
}
