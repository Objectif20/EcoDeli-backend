import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UtilsService {
  constructor() {}

  async fetchDocument(encodedUrl: string): Promise<{ data: Buffer; contentType: string }> {
    const decodedUrl = decodeURIComponent(encodedUrl);

    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
    });

    const contentType = response.headers['content-type'];
    return { data: response.data, contentType };
  }
}
