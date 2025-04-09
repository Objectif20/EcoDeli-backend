import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class UtilsService {
  constructor() {}

  async fetchDocument(url: string): Promise<{ data: Buffer; contentType: string }> {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
    });

    const contentType = response.headers['content-type'];
    return { data: response.data, contentType };
  }
}
