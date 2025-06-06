import { Injectable } from '@nestjs/common';
import { SecretsService } from '../common/services/secrets.service';
import * as OneSignal from '@onesignal/node-onesignal';

@Injectable()
export class OneSignalConfigService {
  private clientWeb: OneSignal.DefaultApi;
  private clientMobile: OneSignal.DefaultApi;
  private initialized = false;

  constructor(private readonly secretsService: SecretsService) {}

  async initialize() {
    if (this.initialized) return;

    const userAuthKey = await this.secretsService.loadSecret('ONESIGNAL_USER_AUTH_KEY');

    const restApiKeyWeb = await this.secretsService.loadSecret('ONESIGNAL_REST_API_KEY');
    const restApiKeyMobile = process.env.ONESIGNAL_API_KEY_MOBILE;

    if (!userAuthKey || !restApiKeyWeb || !restApiKeyMobile) {
      throw new Error('Les clés OneSignal sont manquantes.');
    }

    const configWeb = OneSignal.createConfiguration({
      userAuthKey,
      restApiKey: restApiKeyWeb,
    });
    this.clientWeb = new OneSignal.DefaultApi(configWeb);

    const configMobile = OneSignal.createConfiguration({
      userAuthKey,
      restApiKey: restApiKeyMobile,
    });
    this.clientMobile = new OneSignal.DefaultApi(configMobile);

    this.initialized = true;
  }

  async getWebClient(): Promise<OneSignal.DefaultApi> {
    if (!this.initialized) await this.initialize();
    return this.clientWeb;
  }

  async getMobileClient(): Promise<OneSignal.DefaultApi> {
    if (!this.initialized) await this.initialize();
    return this.clientMobile;
  }
}
