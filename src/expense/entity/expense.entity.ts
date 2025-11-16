import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../user/entity/user.entity';

@Entity()
export class Expense {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  category: string;

  @Column({ type: 'date', default: () => 'CURRENT_DATE' })
  date: Date;

  @ManyToOne(() => User, (user) => user.expenses, { nullable: false })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

