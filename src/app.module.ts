import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import dataSource, { dataSourceOptions } from './db/data-source';
import {
  addTransactionalDataSource,
  getDataSourceByName,
} from 'typeorm-transactional';
import { UserModule } from './user/user.module';
import { ExpenseModule } from './expense/expense.module';
import { OpenAIModule } from './openai/openai.module';
import { User } from './user/entity/user.entity';
import { Expense } from './expense/entity/expense.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory() {
        return {
          ...dataSourceOptions,
          entities: [User, Expense],
        };
      },
      async dataSourceFactory() {
        return Promise.resolve(
          getDataSourceByName('default') ||
            // Note that typeorm-transactional may not work as expected due to the RLSRequestContext. See ../docs/RLS.md for more details.
            addTransactionalDataSource(dataSource),
        );
      },
    }),
    WhatsappModule,
    UserModule,
    ExpenseModule,
    OpenAIModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
