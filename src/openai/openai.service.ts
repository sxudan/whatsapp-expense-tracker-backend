import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  PlatformResponse,
  MessageFormat,
} from '../response-handler/types/response.types';
import { Platform } from '../response-handler/response-handler.service';

export interface ParsedExpense {
  amount: number;
  description?: string;
  category?: string;
  date?: Date;
  isValid: boolean;
  confidence: number;
}

export interface MessageIntent {
  type: 'add_expense' | 'query_expense' | 'unknown';
  queryType?: 'today' | 'week' | 'month' | 'all' | 'total';
  confidence: number;
}

@Injectable()
export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async parseExpenseMessage(message: string): Promise<ParsedExpense> {
    const systemPrompt = `You are an expense tracking assistant. Your job is to parse natural language messages and extract expense information.

Extract the following information from the message:
- amount: The monetary amount (required, must be a positive number)
- description: A brief description of the expense (optional)
- category: A category for the expense like "food", "transport", "shopping", "bills", "entertainment", etc. (optional)
- date: The date of the expense in YYYY-MM-DD format. If not mentioned, use today's date: ${new Date().toISOString().split('T')[0]}

If the message doesn't contain a clear expense (e.g., it's a greeting, question, or unrelated message), set isValid to false.

Respond ONLY with a JSON object in this exact format:
{
  "amount": number,
  "description": "string or null",
  "category": "string or null",
  "date": "YYYY-MM-DD or null",
  "isValid": boolean,
  "confidence": number (0-1)
}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        return {
          amount: 0,
          isValid: false,
          confidence: 0,
        };
      }

      const parsed = JSON.parse(content) as {
        amount?: number;
        description?: string | null;
        category?: string | null;
        date?: string | null;
        isValid?: boolean;
        confidence?: number;
      };

      // Parse date if provided
      let date: Date | undefined;
      if (parsed.date) {
        date = new Date(parsed.date);
      } else {
        date = new Date(); // Default to today
      }

      return {
        amount: parseFloat(String(parsed.amount || 0)) || 0,
        description: parsed.description || undefined,
        category: parsed.category || undefined,
        date,
        isValid: parsed.isValid !== false && (parsed.amount || 0) > 0,
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      console.error('Error parsing expense with OpenAI:', error);
      return {
        amount: 0,
        isValid: false,
        confidence: 0,
      };
    }
  }

  private getPlatformInfo(platform: Platform): {
    name: string;
    templateInfo: string;
    templateInstructions: string;
    templateNameHint: string;
    importantNote: string;
  } {
    switch (platform) {
      case Platform.WHATSAPP:
        return {
          name: 'WhatsApp',
          templateInfo:
            'WhatsApp supports template messages that must be pre-approved in Meta Business Manager.',
          templateInstructions:
            '- Only use TEMPLATE format if you have a valid, pre-approved WhatsApp template name\n- Common approved templates: "hello_world", "sample_shipping_confirmation", "sample_issue_resolution"\n- If you don\'t have an approved template name, always use TEXT format',
          templateNameHint:
            "ONLY include if you have a valid pre-approved WhatsApp template name (e.g., 'hello_world', 'sample_shipping_confirmation')",
          importantNote:
            'IMPORTANT: Only use "template" format if templateName is a valid, pre-approved WhatsApp template. Otherwise, always use "text" format.',
        };
      case Platform.TELEGRAM:
        return {
          name: 'Telegram',
          templateInfo:
            'Telegram supports Markdown and HTML formatting in text messages.',
          templateInstructions:
            '- Use TEXT format for all responses\n- You can use Markdown formatting in the content (bold, italic, links, etc.)',
          templateNameHint: 'Not applicable for Telegram',
          importantNote:
            'IMPORTANT: Always use "text" format for Telegram. Use Markdown in content for formatting.',
        };
      default:
        return {
          name: 'Unknown',
          templateInfo: 'Platform information not available.',
          templateInstructions: '- Use TEXT format for all responses',
          templateNameHint: 'Not applicable',
          importantNote: 'IMPORTANT: Always use "text" format.',
        };
    }
  }

  getAvailableTools() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'add_expense',
          description:
            'Add a new expense to the tracker. Use this when the user wants to record a new expense.',
          parameters: {
            type: 'object',
            properties: {
              amount: {
                type: 'number',
                description:
                  'The monetary amount of the expense (required, must be positive)',
              },
              description: {
                type: 'string',
                description: 'A brief description of what the expense was for',
              },
              category: {
                type: 'string',
                description:
                  'Category of the expense (e.g., food, transport, shopping, bills, entertainment)',
              },
              date: {
                type: 'string',
                description:
                  'Date of the expense in YYYY-MM-DD format. If not specified, use today',
              },
            },
            required: ['amount'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'delete_expense',
          description:
            'Delete or remove an expense. Use this when the user wants to delete an expense by ID, or delete the latest expense.',
          parameters: {
            type: 'object',
            properties: {
              expenseId: {
                type: 'number',
                description:
                  'The ID of the expense to delete. If not provided, delete the most recent expense.',
              },
            },
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_total_expenses_today',
          description: 'Get the total amount and count of expenses for today',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_total_expenses_this_week',
          description:
            'Get the total amount and count of expenses for this week. Use this ONLY when user asks for total expenses this week WITHOUT mentioning a specific category. If user mentions a category (e.g., "food this week", "how much on food this week"), use get_total_expenses_by_date_range instead with category parameter.',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_total_expenses_this_month',
          description:
            'Get the total amount and count of expenses for this month',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_latest_expenses',
          description:
            'Get the most recent expenses. Use this when user asks for "latest", "recent", "last" expenses',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Number of expenses to return (default: 5)',
              },
            },
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_total_expenses_all_time',
          description:
            'Get the total amount of all expenses (all time total). Use this when user asks for "total expense", "total spending", "how much did I spend in total", etc.',
          parameters: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_all_expenses',
          description:
            'Get all expenses with details. Use this when user wants to see the list of expenses, not just the total.',
          parameters: {
            type: 'object',
            properties: {
              limit: {
                type: 'number',
                description: 'Optional limit on number of expenses to return',
              },
            },
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_expenses_by_date_range',
          description:
            'Get expenses filtered by a specific date range. Use this when user asks for expenses for "yesterday", "last week", "last month", "between dates", or any specific date range. You must calculate the start and end dates based on the user\'s request.',
          parameters: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                description:
                  'Start date in YYYY-MM-DD format. Calculate this based on user request (e.g., yesterday, last week, etc.)',
              },
              endDate: {
                type: 'string',
                description:
                  'End date in YYYY-MM-DD format. Calculate this based on user request. If not specified, defaults to today.',
              },
              limit: {
                type: 'number',
                description: 'Optional limit on number of expenses to return',
              },
            },
            required: ['startDate'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'get_total_expenses_by_date_range',
          description:
            'Get total expenses for a specific date range. Use this when user asks for total spending for "yesterday", "last week", "last month", or any specific date range. You must calculate the start and end dates based on the user\'s request. If the user mentions a category (e.g., "food", "transport"), include it in the category parameter to filter by that category.',
          parameters: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                description:
                  'Start date in YYYY-MM-DD format. Calculate this based on user request (e.g., yesterday, last week, etc.)',
              },
              endDate: {
                type: 'string',
                description:
                  'End date in YYYY-MM-DD format. Calculate this based on user request. If not specified, defaults to today.',
              },
              category: {
                type: 'string',
                description:
                  'Optional category to filter by (e.g., "food", "transport", "electronics"). Use this when user asks about spending on a specific category for a date range (e.g., "how much on food this week").',
              },
            },
            required: ['startDate'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'generate_expense_report',
          description:
            'Generate an expense report with a pie chart showing expenses by category. Use this when user asks for "report", "show me a report", "generate report", "expense report", "pie chart", "category chart", "visualization by category", etc.',
          parameters: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                enum: ['this_month', 'this_week', 'all_time'],
                description:
                  'Time period for the report. Default is "this_month"',
              },
            },
            required: [],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'generate_daily_expense_chart',
          description:
            'Generate a bar chart showing daily expenses over time. ALWAYS use this function when user asks for "daily expense report", "daily expenses", "daily spending", "expenses by day", "daily breakdown", "bar chart", "show me daily expenses", "daily expense chart", or any request mentioning "daily" expenses. This generates a BAR CHART (not a pie chart).',
          parameters: {
            type: 'object',
            properties: {
              period: {
                type: 'string',
                enum: ['this_month', 'this_week', 'last_month', 'last_week'],
                description:
                  'Time period for the chart. Default is "this_month"',
              },
              startDate: {
                type: 'string',
                description:
                  'Start date in YYYY-MM-DD format. Use this for custom date ranges.',
              },
              endDate: {
                type: 'string',
                description:
                  'End date in YYYY-MM-DD format. Use this for custom date ranges.',
              },
            },
            required: [],
          },
        },
      },
    ];
  }

  async processMessageWithTools(
    message: string,
    userId: number,
    platform: Platform,
    executeFunction: (functionName: string, args: any) => Promise<any>,
  ): Promise<PlatformResponse> {
    const platformInfo = this.getPlatformInfo(platform);

    const systemPrompt = `You are a helpful expense tracking assistant. You help users track their expenses by adding new expenses, deleting expenses, and answering questions about their spending.

When the user wants to add an expense, use the add_expense function. After adding an expense, always include the total expenses for this month in your response.
When the user wants to delete or remove an expense, use the delete_expense function.
When the user asks about their expenses (totals, latest, recent, etc.), use the appropriate query function.
When the user asks for expenses for a specific date range (e.g., "yesterday", "last week", "last month", "between dates"), use get_expenses_by_date_range or get_total_expenses_by_date_range. You must calculate the start and end dates in YYYY-MM-DD format based on the user's request. IMPORTANT: Always use the current date as a reference point. 
When the user asks about spending on a SPECIFIC CATEGORY for a date range (e.g., "how much on food this week", "food expenses last month"), use get_total_expenses_by_date_range with the category parameter. For example:
- "How much on food this week" → Calculate this week's dates, use get_total_expenses_by_date_range with startDate, endDate, and category: "food"
- "Food expenses last month" → Calculate last month's dates, use get_total_expenses_by_date_range with startDate, endDate, and category: "food"
For example:
- "yesterday" → Calculate yesterday's date: if today is 2025-11-16, then yesterday is 2025-11-15. Use startDate: "2025-11-15", endDate: "2025-11-15"
- "last week" → Calculate 7 days ago from today. Use startDate: (today - 7 days), endDate: today's date
- "last month" → Calculate first and last day of previous month. If today is November 2025, last month is October 2025. Use startDate: "2025-10-01", endDate: "2025-10-31"
- Always format dates as YYYY-MM-DD (e.g., "2025-11-15", not "11/15/2025" or "15-11-2025")
IMPORTANT - Chart Selection:
- When the user asks for "daily expense report", "daily expenses", "daily spending", "expenses by day", "daily breakdown", "bar chart", or ANY request with the word "daily" in it, ALWAYS use generate_daily_expense_chart function. This generates a BAR CHART showing expenses per day.
- When the user asks for "expense report", "pie chart", "category chart", "spending by category", or requests about categories, use generate_expense_report function. This generates a PIE CHART showing expenses by category.
- The key difference: "daily" = bar chart (time-based), "category" = pie chart (category-based).

PLATFORM: ${platformInfo.name}
${platformInfo.templateInfo}

For responses:
- Use TEXT format for all responses (default and recommended)
${platformInfo.templateInstructions}

CRITICAL: You must respond with a JSON object. The "content" field should contain a natural, friendly message that you would send to the user - NOT the JSON structure itself. The content should be conversational and human-like.

FORMATTING RULES:
- When displaying a list of expenses (from get_latest_expenses or get_all_expenses), format them as a bulleted list using "•" or "-" for each expense
- Each expense should be on a new line
- Format: "• $amount - description (category) - date" or similar readable format
- For totals or summaries, keep it concise and friendly

Example of CORRECT list response:
{
  "format": "text",
  "content": "Here are your latest expenses:\n\n• $50.00 - Groceries (Food) - 2024-01-15\n• $25.50 - Coffee (Food) - 2024-01-14\n• $100.00 - Gas (Transport) - 2024-01-13\n\nTotal: $175.50"
}

Example of CORRECT summary response:
{
  "format": "text",
  "content": "Your total expenses today: $125.50 (3 expenses). Great job tracking!"
}

Example of CORRECT add expense response (must include monthly total):
{
  "format": "text",
  "content": "Expense added: $50.00 - Groceries (Food)\n\nYour total expenses this month: $325.50 (8 expenses)"
}

Example of CORRECT chart response (must include imageUrl when chartUrl is returned):
{
  "format": "text",
  "content": "Here's your daily expense report for this month!",
  "imageUrl": "https://quickchart.io/chart?c=..."
}

Example of WRONG response (DO NOT DO THIS):
{
  "format": "text",
  "content": "Here is the JSON response format you requested: {format:text,content:...}"
}

Respond with JSON in this exact format:
{
  "format": "text" | "template",
  "content": "A natural, conversational message to send to the user (NOT the JSON structure)",
  "templateName": "${platformInfo.templateNameHint}",
  "templateParams": { "optional": "parameters for template" },
  "imageUrl": "optional URL to an image (use when generate_expense_report OR generate_daily_expense_chart returns chartUrl)",
  "caption": "optional caption for the image"
}

IMPORTANT: When ANY function (generate_expense_report OR generate_daily_expense_chart) returns a "chartUrl" in the result, you MUST include it in your response as "imageUrl" so the chart image can be sent to the user. The "content" field should still contain a friendly message about the report/chart.

${platformInfo.importantNote}

Be friendly and conversational in your responses. The "content" field should be what you would naturally say to the user. When showing lists, use bullet points and line breaks for readability.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        tools: this.getAvailableTools(),
        tool_choice: 'auto',
        temperature: 0.3,
      });

      const messageResponse = completion.choices[0]?.message;
      const toolCalls = messageResponse?.tool_calls;

      if (toolCalls && toolCalls.length > 0) {
        // Execute the function calls
        const results = await Promise.all(
          toolCalls.map(async (toolCall) => {
            if (toolCall.type === 'function') {
              const functionName = toolCall.function.name;
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const args = JSON.parse(toolCall.function.arguments || '{}');
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              const result = await executeFunction(functionName, args);
              return {
                role: 'tool' as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify(result),
              };
            }
            return null;
          }),
        );

        const validResults = results.filter((r) => r !== null);

        // Get AI's response based on function results
        const finalCompletion = await this.openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message },
            messageResponse,
            ...validResults,
            {
              role: 'user',
              content:
                'Respond with JSON. The "content" field must be a natural, conversational message - NOT the JSON structure. Write as if you are directly talking to the user. CRITICAL: If ANY function result contains a "chartUrl" field, you MUST include it in your response as "imageUrl" so the chart image can be sent to the user. Check all function results for chartUrl.',
            },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        });

        const responseContent =
          finalCompletion.choices[0]?.message?.content ||
          '{"format":"text","content":"Sorry, I encountered an error."}';

        try {
          const parsed = JSON.parse(responseContent) as {
            format?: string;
            content?: string;
            templateName?: string;
            templateParams?: Record<string, any>;
            imageUrl?: string;
            caption?: string;
          };

          const format =
            parsed.format === 'template'
              ? MessageFormat.TEMPLATE
              : MessageFormat.TEXT;

          const response: PlatformResponse = {
            format,
            content: parsed.content || 'Sorry, I encountered an error.',
            templateName: parsed.templateName,
            templateParams: parsed.templateParams,
          };

          // Add image URL if present (for reports with charts)
          if (parsed.imageUrl) {
            const responseWithImage = response as {
              imageUrl?: string;
              caption?: string;
            };
            responseWithImage.imageUrl = parsed.imageUrl;
            responseWithImage.caption = parsed.caption;
          }

          return response;
        } catch {
          // Fallback to text if JSON parsing fails
          return {
            format: MessageFormat.TEXT,
            content: responseContent,
          };
        }
      }

      // No function calls, return direct response as text
      const content =
        messageResponse?.content ||
        "I'm not sure how to help with that. Try asking about your expenses or adding a new expense.";

      return {
        format: MessageFormat.TEXT,
        content,
      };
    } catch (error) {
      console.error('Error processing message with tools:', error);
      return {
        format: MessageFormat.TEXT,
        content:
          'Sorry, I encountered an error processing your request. Please try again.',
      };
    }
  }

  generateExpenseReply(expense: ParsedExpense, saved: boolean): string {
    if (!expense.isValid) {
      return "I couldn't understand that as an expense. Try something like 'Spent $50 on lunch' or 'Coffee $5'";
    }

    if (!saved) {
      return "Sorry, I couldn't save that expense. Please try again.";
    }

    const amountStr = `$${expense.amount.toFixed(2)}`;
    const categoryStr = expense.category ? ` in ${expense.category}` : '';
    const descStr = expense.description ? ` for ${expense.description}` : '';

    return `✅ Saved expense: ${amountStr}${categoryStr}${descStr}. Thanks for tracking!`;
  }

  generateQueryReply(total: number, count: number, period: string): string {
    const totalStr = `$${total.toFixed(2)}`;
    if (count === 0) {
      return `You haven't recorded any expenses ${period} yet.`;
    }
    return `Your total expenses ${period}: ${totalStr} (${count} expense${count > 1 ? 's' : ''})`;
  }
}
