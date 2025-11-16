import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../user/entity/user.entity';
import { Expense } from '../expense/entity/expense.entity';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  entities: [User, Expense],
  migrations: ['dist/db/migrations/*.js'],
  synchronize: false, // Use migrations instead of synchronize
  logging: false,
  ssl: false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
