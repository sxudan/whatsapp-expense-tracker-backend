import { Module } from '@nestjs/common';
import { ResponseHandlerService } from './response-handler.service';
import { WhatsAppFormatter } from './formatters/whatsapp.formatter';
import { TelegramFormatter } from './formatters/telegram.formatter';

@Module({
  providers: [ResponseHandlerService, WhatsAppFormatter, TelegramFormatter],
  exports: [ResponseHandlerService],
})
export class ResponseHandlerModule {}

