import { Injectable } from '@nestjs/common';
import { OpenAIService } from '../openai/openai.service';
import { ExpenseService } from '../expense/expense.service';
import { UserService } from '../user/user.service';
import { ChartService } from '../chart/chart.service';
import { PlatformResponse } from '../response-handler/types/response.types';
import { Platform } from '../response-handler/response-handler.service';

@Injectable()
export class ExpenseHandlerService {
  constructor(
    private readonly openAIService: OpenAIService,
    private readonly expenseService: ExpenseService,
    private readonly userService: UserService,
    private readonly chartService: ChartService,
  ) {}

  private formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return date; // Already in YYYY-MM-DD format
    }
    // If it's a Date object, format it
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private async executeFunction(
    functionName: string,
    args: any,
    userId: number,
  ): Promise<any> {
    const user = await this.userService.findById(userId);
    if (!user) {
      return { error: "Couldn't find your user account" };
    }

    switch (functionName) {
      case 'add_expense': {
        try {
          const date = (args as { date?: string }).date
            ? new Date((args as { date: string }).date)
            : new Date();

          const expenseArgs = args as {
            amount: number;
            description?: string;
            category?: string;
          };

          const expense = await this.expenseService.createExpense({
            amount: expenseArgs.amount,
            description: expenseArgs.description,
            category: expenseArgs.category,
            date,
            user,
          });

          // Get monthly total after adding expense
          const monthlyData =
            await this.expenseService.getTotalExpensesByUserThisMonth(userId);

          return {
            success: true,
            expense: {
              amount: expense.amount,
              description: expense.description,
              category: expense.category,
              date: this.formatDate(expense.date),
            },
            monthlyTotal: monthlyData.total,
            monthlyCount: monthlyData.count,
          };
        } catch (error) {
          console.error('Error adding expense:', error);
          return { success: false, error: 'Failed to save expense' };
        }
      }

      case 'delete_expense': {
        try {
          const deleteArgs = args as { expenseId?: number };
          let expenseId = deleteArgs.expenseId;

          // If no expenseId provided, delete the most recent expense
          if (!expenseId) {
            const latestExpenses = await this.expenseService.getLatestExpenses(
              userId,
              1,
            );
            if (latestExpenses.length === 0) {
              return {
                success: false,
                error: 'No expenses found to delete',
              };
            }
            expenseId = latestExpenses[0].id;
          }

          // Verify expense belongs to user and delete
          const deleted = await this.expenseService.deleteExpense(
            expenseId,
            userId,
          );

          if (!deleted) {
            return {
              success: false,
              error:
                'Expense not found or you do not have permission to delete it',
            };
          }

          return {
            success: true,
            message: `Expense ${expenseId} deleted successfully`,
            expenseId,
          };
        } catch (error) {
          console.error('Error deleting expense:', error);
          return { success: false, error: 'Failed to delete expense' };
        }
      }

      case 'get_total_expenses_today': {
        const data =
          await this.expenseService.getTotalExpensesByUserToday(userId);
        return {
          total: data.total,
          count: data.count,
          period: 'today',
        };
      }

      case 'get_total_expenses_this_week': {
        const data =
          await this.expenseService.getTotalExpensesByUserThisWeek(userId);
        return {
          total: data.total,
          count: data.count,
          period: 'this week',
        };
      }

      case 'get_total_expenses_this_month': {
        const data =
          await this.expenseService.getTotalExpensesByUserThisMonth(userId);
        return {
          total: data.total,
          count: data.count,
          period: 'this month',
        };
      }

      case 'get_latest_expenses': {
        const limitArgs = args as { limit?: number };
        const limit = limitArgs.limit || 5;
        const expenses = await this.expenseService.getLatestExpenses(
          userId,
          limit,
        );
        return {
          expenses: expenses.map((exp) => ({
            amount: exp.amount,
            description: exp.description,
            category: exp.category,
            date: this.formatDate(exp.date),
          })),
          count: expenses.length,
        };
      }

      case 'get_total_expenses_all_time': {
        const total = await this.expenseService.getTotalExpensesByUser(userId);
        return {
          total,
          period: 'all time',
        };
      }

      case 'get_all_expenses': {
        const limitArgs = args as { limit?: number };
        const expenses = await this.expenseService.getExpensesByUser(
          userId,
          limitArgs.limit,
        );
        const total = expenses.reduce((sum, exp) => {
          const amount = Number(exp.amount);
          return sum + amount;
        }, 0);
        return {
          expenses: expenses.map((exp) => ({
            amount: exp.amount,
            description: exp.description,
            category: exp.category,
            date: this.formatDate(exp.date),
          })),
          total,
          count: expenses.length,
        };
      }

      case 'get_expenses_by_date_range': {
        const rangeArgs = args as {
          startDate: string;
          endDate?: string;
          limit?: number;
        };

        // Parse dates and ensure they're in local timezone
        // Create dates at midnight local time to avoid timezone issues
        const parseLocalDate = (dateStr: string): Date => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const startDate = parseLocalDate(rangeArgs.startDate);
        const endDate = rangeArgs.endDate
          ? parseLocalDate(rangeArgs.endDate)
          : new Date();

        console.log(
          `Querying expenses from ${rangeArgs.startDate} to ${rangeArgs.endDate || 'today'}`,
        );
        console.log(
          `Parsed dates: start=${startDate.toISOString()}, end=${endDate.toISOString()}`,
        );

        const expenses =
          await this.expenseService.getExpensesByUserAndDateRange(
            userId,
            startDate,
            endDate,
          );

        console.log(`Found ${expenses.length} expenses in date range`);

        // Apply limit if specified
        const limitedExpenses = rangeArgs.limit
          ? expenses.slice(0, rangeArgs.limit)
          : expenses;

        const total = limitedExpenses.reduce((sum, exp) => {
          const amount = Number(exp.amount);
          return sum + amount;
        }, 0);

        return {
          expenses: limitedExpenses.map((exp) => ({
            amount: exp.amount,
            description: exp.description,
            category: exp.category,
            date: this.formatDate(exp.date),
          })),
          total,
          count: limitedExpenses.length,
          startDate: rangeArgs.startDate,
          endDate: rangeArgs.endDate || this.formatDate(new Date()),
        };
      }

      case 'get_total_expenses_by_date_range': {
        const rangeArgs = args as {
          startDate: string;
          endDate?: string;
          category?: string;
        };

        // Parse dates and ensure they're in local timezone
        // Create dates at midnight local time to avoid timezone issues
        const parseLocalDate = (dateStr: string): Date => {
          const [year, month, day] = dateStr.split('-').map(Number);
          return new Date(year, month - 1, day);
        };

        const startDate = parseLocalDate(rangeArgs.startDate);
        const endDate = rangeArgs.endDate
          ? parseLocalDate(rangeArgs.endDate)
          : new Date();

        console.log(
          `Querying total expenses from ${rangeArgs.startDate} to ${rangeArgs.endDate || 'today'}`,
        );

        // If category is specified, filter by category
        if (rangeArgs.category) {
          const categoryData =
            await this.expenseService.getExpensesByCategoryForDateRange(
              userId,
              rangeArgs.category,
              startDate,
              endDate,
            );
          return {
            total: categoryData.total,
            count: categoryData.count,
            category: rangeArgs.category,
            startDate: rangeArgs.startDate,
            endDate: rangeArgs.endDate || this.formatDate(new Date()),
          };
        }

        const expenses =
          await this.expenseService.getExpensesByUserAndDateRange(
            userId,
            startDate,
            endDate,
          );

        const total = expenses.reduce((sum, exp) => {
          const amount = Number(exp.amount);
          return sum + amount;
        }, 0);

        return {
          total,
          count: expenses.length,
          startDate: rangeArgs.startDate,
          endDate: rangeArgs.endDate || this.formatDate(new Date()),
        };
      }

      case 'generate_daily_expense_chart': {
        try {
          const chartArgs = args as {
            startDate?: string;
            endDate?: string;
            period?: 'this_month' | 'this_week' | 'last_month' | 'last_week';
          };

          let startDate: Date;
          let endDate: Date;

          if (chartArgs.startDate && chartArgs.endDate) {
            // Parse dates and ensure they're in local timezone
            const parseLocalDate = (dateStr: string): Date => {
              const [year, month, day] = dateStr.split('-').map(Number);
              return new Date(year, month - 1, day);
            };
            startDate = parseLocalDate(chartArgs.startDate);
            endDate = parseLocalDate(chartArgs.endDate);
          } else if (chartArgs.period) {
            // Use predefined periods
            const today = new Date();
            if (chartArgs.period === 'this_month') {
              startDate = new Date(today.getFullYear(), today.getMonth(), 1);
              endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            } else if (chartArgs.period === 'this_week') {
              today.setHours(0, 0, 0, 0);
              const dayOfWeek = today.getDay();
              startDate = new Date(today);
              startDate.setDate(today.getDate() - dayOfWeek);
              endDate = new Date(today);
            } else if (chartArgs.period === 'last_month') {
              const lastMonth = new Date(
                today.getFullYear(),
                today.getMonth() - 1,
                1,
              );
              startDate = new Date(
                lastMonth.getFullYear(),
                lastMonth.getMonth(),
                1,
              );
              endDate = new Date(
                lastMonth.getFullYear(),
                lastMonth.getMonth() + 1,
                0,
              );
            } else {
              // last_week
              today.setHours(0, 0, 0, 0);
              const dayOfWeek = today.getDay();
              endDate = new Date(today);
              endDate.setDate(today.getDate() - dayOfWeek - 1); // Last day of last week
              startDate = new Date(endDate);
              startDate.setDate(endDate.getDate() - 6); // First day of last week
            }
          } else {
            // Default to this month
            const today = new Date();
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          }

          // Get daily expenses
          const dailyData = await this.expenseService.getDailyExpenses(
            userId,
            startDate,
            endDate,
          );

          if (dailyData.length === 0) {
            return {
              success: false,
              error: 'No expenses found for the selected period',
            };
          }

          // Prepare chart data
          const labels = dailyData.map((item) => {
            // Format date for better readability (e.g., "Nov 15" instead of "2025-11-15")
            const date = new Date(item.date);
            const month = date.toLocaleString('default', { month: 'short' });
            const day = date.getDate();
            return `${month} ${day}`;
          });
          const data = dailyData.map((item) => item.total);

          // Calculate total
          const total = dailyData.reduce((sum, item) => sum + item.total, 0);

          // Generate bar chart URL
          const periodTitle = chartArgs.period
            ? chartArgs.period
                .replace('_', ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())
            : 'Selected Period';
          const chartUrl = this.chartService.generateBarChartUrl(
            { labels, data, total },
            `Daily Expenses - ${periodTitle}`,
          );

          console.log('Generated daily expense bar chart URL:', chartUrl);

          return {
            success: true,
            chartUrl,
            dailyData,
            total,
            startDate: this.formatDate(startDate),
            endDate: this.formatDate(endDate),
          };
        } catch (error) {
          console.error('Error generating daily expense chart:', error);
          return { success: false, error: 'Failed to generate chart' };
        }
      }

      case 'generate_expense_report': {
        try {
          const reportArgs = args as {
            period?: 'this_month' | 'this_week' | 'all_time';
          };
          const period = reportArgs.period || 'this_month';

          // Get expenses grouped by category
          const categoryData = await this.expenseService.getExpensesByCategory(
            userId,
            period,
          );

          if (categoryData.length === 0) {
            return {
              success: false,
              error: 'No expenses found for the selected period',
            };
          }

          // Prepare chart data - ensure amounts are numbers
          const labels = categoryData.map(
            (item) => item.category || 'Uncategorized',
          );
          const data = categoryData.map((item) => Number(item.total));

          console.log('Chart data:', { labels, data, categoryData });

          // Calculate totals
          const total = categoryData.reduce((sum, item) => sum + item.total, 0);
          const totalCount = categoryData.reduce(
            (sum, item) => sum + item.count,
            0,
          );

          // Generate pie chart URL
          const periodTitle =
            period === 'this_month'
              ? 'This Month'
              : period === 'this_week'
                ? 'This Week'
                : 'All Time';
          const chartUrl = this.chartService.generatePieChartUrl(
            { labels, data, total },
            `Expense Report - ${periodTitle}`,
          );

          console.log('Generated chart URL:', chartUrl);

          return {
            success: true,
            chartUrl,
            period,
            categoryData: categoryData.map((item) => ({
              category: item.category,
              total: item.total,
              count: item.count,
              percentage: ((item.total / total) * 100).toFixed(1),
            })),
            total,
            totalCount,
          };
        } catch (error) {
          console.error('Error generating expense report:', error);
          return { success: false, error: 'Failed to generate report' };
        }
      }

      default:
        return { error: `Unknown function: ${functionName}` };
    }
  }

  async processMessage(
    messageText: string,
    userId: number,
    platform: Platform,
  ): Promise<PlatformResponse> {
    return await this.openAIService.processMessageWithTools(
      messageText,
      userId,
      platform,
      (functionName, args) => this.executeFunction(functionName, args, userId),
    );
  }
}
