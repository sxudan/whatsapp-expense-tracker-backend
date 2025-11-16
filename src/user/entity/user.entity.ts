import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Expense } from '../../expense/entity/expense.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  phoneNumber: string;

  @OneToMany(() => Expense, (expense) => expense.user)
  expenses: Expense[];
}
