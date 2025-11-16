import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';
import { WhatsappMessageDto } from 'src/whatsapp/dto';

@Controller('expenses')
export class ExpenseController {
  constructor(
    private readonly expenseService: ExpenseService,
    private readonly whatsappService: WhatsappService,
  ) {}

  @Get('user/:userId')
  async getExpensesByUser(@Param('userId') userId: number) {
    return await this.expenseService.getExpensesByUser(userId);
  }

  @Get('user/:userId/total')
  async getTotalExpenses(@Param('userId') userId: number) {
    const total = await this.expenseService.getTotalExpensesByUser(userId);
    return { total };
  }

  @Get('/webhook')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  @Post('/webhook')
  async handleWebhook(@Body() body: WhatsappMessageDto) {
    return this.whatsappService.handleIncomingMessage(body);
  }
}
