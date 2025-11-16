import { Injectable } from '@nestjs/common';
import { PlatformResponse, MessageFormat } from '../types/response.types';

// Telegram message format (for future use)
export interface TelegramMessage {
  chat_id: string | number;
  text: string;
  parse_mode?: 'Markdown' | 'HTML';
  reply_markup?: any;
}

@Injectable()
export class TelegramFormatter {
  format(response: PlatformResponse, chatId: string | number): TelegramMessage {
    switch (response.format) {
      // case MessageFormat.MARKDOWN:
      //   return {
      //     chat_id: chatId,
      //     text: response.content,
      //     parse_mode: 'Markdown',
      //   };
      case MessageFormat.TEXT:
      default:
        return {
          chat_id: chatId,
          text: response.content,
        };
    }
  }
}
