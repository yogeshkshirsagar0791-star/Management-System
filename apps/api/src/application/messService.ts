import type { AttendanceSlot, PaymentMode, PaymentStatus, PlanType } from '@mess/shared';
import type {
  CreateCustomerInput,
  LogWalkInInput,
  MarkAttendanceInput,
  RecordPaymentInput,
  UpdatePaymentInput,
  UpdateWalkInInput,
  UpdateCustomerInput,
} from '../domain/messRepository.js';
import { prismaMessRepository } from '../infrastructure/repositories/prismaMessRepository.js';
import { memoryMessRepository } from '../infrastructure/repositories/memoryMessRepository.js';

export class MessService {
  private readonly primaryRepository = process.env.DATABASE_URL ? prismaMessRepository : memoryMessRepository;

  private async withRepositoryFallback<T>(operation: (repository: typeof this.primaryRepository) => Promise<T>) {
    if (this.primaryRepository === memoryMessRepository) {
      return operation(memoryMessRepository);
    }

    try {
      return await operation(this.primaryRepository);
    } catch (error) {
      console.error('Primary repository failed, using memory fallback:', error);
      return operation(memoryMessRepository);
    }
  }

  async listCustomers(search?: string) {
    return this.withRepositoryFallback((repository) => repository.listCustomers(search));
  }

  async getCustomerByMessNumber(messNumber: string) {
    return this.withRepositoryFallback((repository) => repository.getCustomerByMessNumber(messNumber));
  }

  async createCustomer(input: CreateCustomerInput) {
    return this.withRepositoryFallback((repository) => repository.createCustomer(input));
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput) {
    return this.withRepositoryFallback((repository) => repository.updateCustomer(customerId, input));
  }

  async deleteCustomer(customerId: string) {
    return this.withRepositoryFallback((repository) => repository.deleteCustomer(customerId));
  }

  async listPayments() {
    return this.withRepositoryFallback((repository) => repository.listPayments());
  }

  async recordPayment(input: RecordPaymentInput) {
    return this.withRepositoryFallback((repository) => repository.recordPayment(input));
  }

  async updatePayment(paymentId: string, input: UpdatePaymentInput) {
    return this.withRepositoryFallback((repository) => repository.updatePayment(paymentId, input));
  }

  async deletePayment(paymentId: string) {
    return this.withRepositoryFallback((repository) => repository.deletePayment(paymentId));
  }

  async listDefaulters(month?: string) {
    return this.withRepositoryFallback((repository) => repository.listDefaulters(month));
  }

  async getMonthlyResetSummary(month?: string) {
    return this.withRepositoryFallback((repository) => repository.getMonthlyResetSummary(month));
  }

  async markAttendance(input: MarkAttendanceInput) {
    return this.withRepositoryFallback((repository) => repository.markAttendance(input));
  }

  async listAttendanceByDate(date?: string, slot?: AttendanceSlot) {
    return this.withRepositoryFallback((repository) => repository.listAttendanceByDate(date, slot));
  }

  async logWalkIn(input: LogWalkInInput) {
    return this.withRepositoryFallback((repository) => repository.logWalkIn(input));
  }

  async updateWalkIn(walkInId: string, input: UpdateWalkInInput) {
    return this.withRepositoryFallback((repository) => repository.updateWalkIn(walkInId, input));
  }

  async deleteWalkIn(walkInId: string) {
    return this.withRepositoryFallback((repository) => repository.deleteWalkIn(walkInId));
  }

  async listWalkInsByDate(date?: string) {
    return this.withRepositoryFallback((repository) => repository.listWalkInsByDate(date));
  }

  async getDashboardSummary(date?: string, month?: string) {
    return this.withRepositoryFallback((repository) => repository.getDashboardSummary(date, month));
  }

  async answerQuery(query: string) {
    return this.withRepositoryFallback((repository) => repository.answerQuery(query));
  }
}

export const messService = new MessService();
export type { AttendanceSlot, PaymentMode, PaymentStatus, PlanType };
