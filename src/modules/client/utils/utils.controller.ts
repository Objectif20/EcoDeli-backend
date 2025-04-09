import { Controller, Get, Query, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { UtilsService } from './utils.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('client/utils')
export class UtilsController {
  constructor(private readonly utilsService: UtilsService) {}

  @Get("document")
  @ApiOperation({
    summary: 'Retrieve a document from a given URL',
    operationId: 'getDocumentFromUrl',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the requested document.',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request. Invalid URL.',
  })
  async getDocument(@Query('url') url: string, @Res() res: Response): Promise<void> {
    if (!url) {
      res.status(HttpStatus.BAD_REQUEST).json({ message: 'URL is required' });
      return;
    }

    try {
      const { data, contentType } = await this.utilsService.fetchDocument(url);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'inline');
      res.send(data);
    } catch (error) {
      console.error('Error fetching the document:', error);
      res.status(HttpStatus.BAD_REQUEST).json({ message: 'Error fetching the document', error: error.message });
    }
  }
}
