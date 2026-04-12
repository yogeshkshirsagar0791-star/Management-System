import { messService } from './messService.js';

export class ReportService {
  async getDailyReport(date?: string) {
    const summary = await messService.getDashboardSummary(date);
    const attendance = await messService.listAttendanceByDate(date);
    const walkIns = await messService.listWalkInsByDate(date);

    return {
      date: date ?? new Date().toISOString().slice(0, 10),
      summary,
      attendance,
      walkIns,
    };
  }

  async getMealSummary(date?: string) {
    return messService.getDashboardSummary(date);
  }

  async getEarnings(date?: string) {
    const summary = await messService.getDashboardSummary(date);
    return {
      date: date ?? new Date().toISOString().slice(0, 10),
      totalRevenue: summary.totalRevenue + summary.walkInRevenue,
      walkInRevenue: summary.walkInRevenue,
      subscriptionRevenue: summary.totalRevenue,
    };
  }
}

export const reportService = new ReportService();
