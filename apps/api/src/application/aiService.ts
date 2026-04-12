import { buildStructuredPrompt } from '../ai/structuredPrompt.js';
import { messService } from './messService.js';

export class AiService {
  async answer(query: string) {
    const summary = await messService.getDashboardSummary();
    const defaulters = (await messService.listDefaulters()).map((customer) => customer.name);
    const prompt = buildStructuredPrompt(query, {
      organizationName: 'Demo Mess',
      date: new Date().toISOString().slice(0, 10),
      month: new Date().toISOString().slice(0, 7),
      totalCustomers: summary.totalCustomers,
      pendingPayments: summary.pendingPayments,
      dailyAttendance: summary.dailyAttendance,
      dailyMealCount: summary.dailyMealCount,
      vegMeals: summary.vegMeals,
      nonVegMeals: summary.nonVegMeals,
      totalRevenue: summary.totalRevenue,
      walkInRevenue: summary.walkInRevenue,
      defaulters,
    });

    const answer = await messService.answerQuery(query);

    return { answer, prompt };
  }
}

export const aiService = new AiService();
