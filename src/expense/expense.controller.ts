import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ExpenseService } from './expense.service';

@Controller('expenses')
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Get('user/:userId')
  async getExpensesByUser(@Param('userId') userId: number) {
    return await this.expenseService.getExpensesByUser(userId);
  }

  @Get('user/:userId/total')
  async getTotalExpenses(@Param('userId') userId: number) {
    const total = await this.expenseService.getTotalExpensesByUser(userId);
    return { total };
  }
}

