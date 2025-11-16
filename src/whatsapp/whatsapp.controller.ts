import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappMessageDto } from './dto';

@Controller('whatsapp/webhook')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('/')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  @Post('/')
  async handleWebhook(@Body() body: WhatsappMessageDto) {
    return this.whatsappService.handleIncomingMessage(body);
  }
}
