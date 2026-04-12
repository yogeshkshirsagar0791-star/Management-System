export interface MessAiContext {
  organizationName: string;
  date: string;
  month: string;
  totalCustomers: number;
  pendingPayments: number;
  dailyAttendance: number;
  dailyMealCount: number;
  vegMeals: number;
  nonVegMeals: number;
  totalRevenue: number;
  walkInRevenue: number;
  defaulters: string[];
}

export function buildStructuredPrompt(query: string, context: MessAiContext): string {
  return [
    'You are an operations assistant for a mess management system.',
    'Answer only from the provided database context.',
    'If the data is insufficient, say so clearly.',
    '',
    `Query: ${query}`,
    `Organization: ${context.organizationName}`,
    `Date: ${context.date}`,
    `Month: ${context.month}`,
    `Total customers: ${context.totalCustomers}`,
    `Pending payments: ${context.pendingPayments}`,
    `Daily attendance: ${context.dailyAttendance}`,
    `Daily meal count: ${context.dailyMealCount}`,
    `Veg meals: ${context.vegMeals}`,
    `Non-veg meals: ${context.nonVegMeals}`,
    `Subscription revenue today: ${context.totalRevenue}`,
    `Walk-in revenue today: ${context.walkInRevenue}`,
    `Defaulters: ${context.defaulters.length > 0 ? context.defaulters.join(', ') : 'none'}`,
  ].join('\n');
}
