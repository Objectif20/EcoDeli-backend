import { Injectable } from '@nestjs/common';
import { SecretClient } from '@azure/keyvault-secrets';
import { ClientSecretCredential } from '@azure/identity';

// Configuration de l'accès à Azure Key Vault

import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class AzureKeyVaultService {
  private client: SecretClient;

  constructor() {
    const keyVaultUrl = process.env.AZURE_KEY_VAULT_URL; 
    const tenantId = process.env.AZURE_TENANT_ID; 
    const clientId = process.env.AZURE_CLIENT_ID; 
    const clientSecret = process.env.AZURE_CLIENT_SECRET; 

    if (!keyVaultUrl || !tenantId || !clientId || !clientSecret) {
      throw new Error('Impossible de récupérer les secrets Azure Key Vault.');
    }

    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    this.client = new SecretClient(keyVaultUrl, credential);
  }

  async getSecret(secretName: string): Promise<string> {
    const secret = await this.client.getSecret(secretName);
    if (!secret.value) {
      throw new Error(`Secret ${secretName} non trouvé.`);
    }
    console.log(`Secret ${secretName} trouvé.`);
    return secret.value;
  }
}

