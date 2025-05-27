import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UtilsService {
  constructor() {}

  async fetchDocument(encodedUrl: string): Promise<{ data: Buffer; contentType: string }> {
    const decodedUrl = decodeURIComponent(encodedUrl);

    console.log('Decoded URL:', decodedUrl);

    const response = await axios.get(decodedUrl, {
      responseType: 'arraybuffer',
    });

    console.log('Fetched document from URL:', decodedUrl);

    const contentType = response.headers['content-type'];
    return { data: response.data, contentType };
  }
}
