import { Injectable } from '@nestjs/common';
import { PlatformResponse, MessageFormat } from './types/response.types';
import { WhatsAppFormatter } from './formatters/whatsapp.formatter';
import { TelegramFormatter } from './formatters/telegram.formatter';

export enum Platform {
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
}

@Injectable()
export class ResponseHandlerService {
  constructor(
    private readonly whatsappFormatter: WhatsAppFormatter,
    private readonly telegramFormatter: TelegramFormatter,
  ) {}

  formatForPlatform(
    response: PlatformResponse,
    platform: Platform,
    recipientId: string | number,
  ): any {
    switch (platform) {
      case Platform.WHATSAPP:
        return this.whatsappFormatter.format(response, recipientId as string);
      case Platform.TELEGRAM:
        return this.telegramFormatter.format(response, recipientId);
      default:
        throw new Error(`Unsupported platform`);
    }
  }

  createTextResponse(content: string): PlatformResponse {
    return {
      format: MessageFormat.TEXT,
      content,
    };
  }

  createTemplateResponse(
    content: string,
    templateName: string,
    templateParams?: Record<string, any>,
  ): PlatformResponse {
    return {
      format: MessageFormat.TEMPLATE,
      content,
      templateName,
      templateParams,
    };
  }
}
