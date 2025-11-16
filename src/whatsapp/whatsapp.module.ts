import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';
import { UserModule } from '../user/user.module';
import { ExpenseHandlerModule } from '../expense-handler/expense-handler.module';

@Module({
  imports: [UserModule, ExpenseHandlerModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
