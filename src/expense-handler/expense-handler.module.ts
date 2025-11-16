import { Module } from '@nestjs/common';
import { ExpenseHandlerService } from './expense-handler.service';
import { OpenAIModule } from '../openai/openai.module';
import { ExpenseModule } from '../expense/expense.module';
import { UserModule } from '../user/user.module';
import { ChartModule } from '../chart/chart.module';

@Module({
  imports: [OpenAIModule, ExpenseModule, UserModule, ChartModule],
  providers: [ExpenseHandlerService],
  exports: [ExpenseHandlerService],
})
export class ExpenseHandlerModule {}

