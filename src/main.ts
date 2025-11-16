import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { initializeTransactionalContext } from 'typeorm-transactional';

async function bootstrap() {
  dotenv.config();
  initializeTransactionalContext();
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
