import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Expense } from './entity/expense.entity';
import { User } from '../user/entity/user.entity';

export interface CreateExpenseDto {
  amount: number;
  description?: string;
  category?: string;
  date?: Date;
  user: User;
}

@Injectable()
export class ExpenseService {
  constructor(
    @InjectRepository(Expense)
    private expenseRepository: Repository<Expense>,
  ) {}

  async deleteExpense(expenseId: number, userId: number): Promise<boolean> {
    const expense = await this.expenseRepository.findOne({
      where: { id: expenseId, user: { id: userId } },
    });

    if (!expense) {
      return false;
    }

    await this.expenseRepository.remove(expense);
    return true;
  }

  async getExpenseById(
    expenseId: number,
    userId: number,
  ): Promise<Expense | null> {
    return await this.expenseRepository.findOne({
      where: { id: expenseId, user: { id: userId } },
    });
  }

  async createExpense(createExpenseDto: CreateExpenseDto): Promise<Expense> {
    // Ensure date is properly formatted for DATE column (YYYY-MM-DD)
    // Use local date, not UTC
    let dateToSave: Date;
    if (createExpenseDto.date) {
      const date = createExpenseDto.date;
      const year = date.getFullYear();
      const month = date.getMonth();
      const day = date.getDate();
      dateToSave = new Date(year, month, day);
    } else {
      const today = new Date();
      dateToSave = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
    }

    // Normalize category to lowercase for consistency
    const normalizedCategory = createExpenseDto.category
      ? createExpenseDto.category.trim().toLowerCase()
      : undefined;

    const expenseData = {
      ...createExpenseDto,
      category: normalizedCategory,
      date: dateToSave,
    };
    const expense = this.expenseRepository.create(expenseData);
    const saved = await this.expenseRepository.save(expense);
    const dateStr =
      typeof saved.date === 'string'
        ? saved.date
        : saved.date.toISOString().split('T')[0];
    console.log(
      `Saved expense with date: ${dateStr} for user: ${expenseData.user.id}`,
    );
    return saved;
  }

  async getExpensesByUser(userId: number, limit?: number): Promise<Expense[]> {
    const query = this.expenseRepository.find({
      where: { user: { id: userId } },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
    if (limit) {
      return (await query).slice(0, limit);
    }
    return await query;
  }

  async getLatestExpenses(
    userId: number,
    limit: number = 5,
  ): Promise<Expense[]> {
    return await this.expenseRepository.find({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getExpensesByUserAndDateRange(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Expense[]> {
    // Format dates as YYYY-MM-DD strings using local timezone (not UTC)
    // This matches how dates are stored in the database
    const formatLocalDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const startDateStr = formatLocalDate(startDate);
    const endDateStr = formatLocalDate(endDate);

    return await this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.userId = :userId', { userId })
      .andWhere('expense.date >= :startDate', { startDate: startDateStr })
      .andWhere('expense.date <= :endDate', { endDate: endDateStr })
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .getMany();
  }

  async getTotalExpensesByUser(userId: number): Promise<number> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const result = await this.expenseRepository
      .createQueryBuilder('expense')
      .select('SUM(expense.amount)', 'total')
      .where('expense.userId = :userId', { userId })
      .getRawOne();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument
    return parseFloat(result?.total || '0');
  }

  async getTotalExpensesByUserToday(userId: number): Promise<{
    total: number;
    count: number;
  }> {
    // Get today's date as YYYY-MM-DD string (local timezone, not UTC)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    console.log(`Querying expenses for today: ${todayStr} for user: ${userId}`);

    // Query using date string comparison
    const expenses = await this.expenseRepository
      .createQueryBuilder('expense')
      .where('expense.userId = :userId', { userId })
      .andWhere('expense.date = :today', { today: todayStr })
      .orderBy('expense.date', 'DESC')
      .addOrderBy('expense.createdAt', 'DESC')
      .getMany();

    console.log(`Found ${expenses.length} expenses for today`);

    // Ensure amounts are numbers (they might be stored as strings in DB)
    const total = expenses.reduce((sum, expense) => {
      const amount = Number(expense.amount);
      return sum + amount;
    }, 0);
    return { total, count: expenses.length };
  }

  async getTotalExpensesByUserThisWeek(userId: number): Promise<{
    total: number;
    count: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    const expenses = await this.getExpensesByUserAndDateRange(
      userId,
      startOfWeek,
      endOfWeek,
    );

    // Ensure amounts are numbers (they might be stored as strings in DB)
    const total = expenses.reduce((sum, expense) => {
      const amount = Number(expense.amount);
      return sum + amount;
    }, 0);
    return { total, count: expenses.length };
  }

  async getTotalExpensesByUserThisMonth(userId: number): Promise<{
    total: number;
    count: number;
  }> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    const expenses = await this.getExpensesByUserAndDateRange(
      userId,
      startOfMonth,
      endOfMonth,
    );

    // Ensure amounts are numbers (they might be stored as strings in DB)
    const total = expenses.reduce((sum, expense) => {
      const amount = Number(expense.amount);
      return sum + amount;
    }, 0);
    return { total, count: expenses.length };
  }

  async getExpensesByCategory(
    userId: number,
    period?: 'this_month' | 'this_week' | 'all_time',
  ): Promise<Array<{ category: string; total: number; count: number }>> {
    let expenses: Expense[];

    if (period === 'this_month') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);
      expenses = await this.getExpensesByUserAndDateRange(
        userId,
        startOfMonth,
        endOfMonth,
      );
    } else if (period === 'this_week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);
      expenses = await this.getExpensesByUserAndDateRange(
        userId,
        startOfWeek,
        endOfWeek,
      );
    } else {
      expenses = await this.getExpensesByUser(userId);
    }

    // Group by category (normalize to lowercase for case-insensitive grouping)
    const categoryMap = new Map<string, { total: number; count: number }>();

    expenses.forEach((expense) => {
      // Normalize category to lowercase to handle case sensitivity issues
      const normalizedCategory = expense.category
        ? expense.category.trim().toLowerCase()
        : 'uncategorized';
      const existing = categoryMap.get(normalizedCategory) || {
        total: 0,
        count: 0,
      };
      // Ensure amount is a number (it might be stored as string in DB)
      const amount = Number(expense.amount);
      categoryMap.set(normalizedCategory, {
        total: existing.total + amount,
        count: existing.count + 1,
      });
    });

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      ...data,
    }));
  }

  async getDailyExpenses(
    userId: number,
    startDate: Date,
    endDate: Date,
  ): Promise<Array<{ date: string; total: number; count: number }>> {
    const expenses = await this.getExpensesByUserAndDateRange(
      userId,
      startDate,
      endDate,
    );

    // Group by date
    const dateMap = new Map<string, { total: number; count: number }>();

    expenses.forEach((expense) => {
      const dateStr = this.formatDate(expense.date);
      const existing = dateMap.get(dateStr) || { total: 0, count: 0 };
      const amount = Number(expense.amount);
      dateMap.set(dateStr, {
        total: existing.total + amount,
        count: existing.count + 1,
      });
    });

    // Sort by date
    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        ...data,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date; // Already in YYYY-MM-DD format
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
