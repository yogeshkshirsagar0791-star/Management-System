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
  private readonly repository = process.env.DATABASE_URL ? prismaMessRepository : memoryMessRepository;

  async listCustomers(search?: string) {
    return this.repository.listCustomers(search);
  }

  async getCustomerByMessNumber(messNumber: string) {
    return this.repository.getCustomerByMessNumber(messNumber);
  }

  async createCustomer(input: CreateCustomerInput) {
    return this.repository.createCustomer(input);
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput) {
    return this.repository.updateCustomer(customerId, input);
  }

  async deleteCustomer(customerId: string) {
    return this.repository.deleteCustomer(customerId);
  }

  async listPayments() {
    return this.repository.listPayments();
  }

  async recordPayment(input: RecordPaymentInput) {
    return this.repository.recordPayment(input);
  }

  async updatePayment(paymentId: string, input: UpdatePaymentInput) {
    return this.repository.updatePayment(paymentId, input);
  }

  async deletePayment(paymentId: string) {
    return this.repository.deletePayment(paymentId);
  }

  async listDefaulters(month?: string) {
    return this.repository.listDefaulters(month);
  }

  async getMonthlyResetSummary(month?: string) {
    return this.repository.getMonthlyResetSummary(month);
  }

  async markAttendance(input: MarkAttendanceInput) {
    return this.repository.markAttendance(input);
  }

  async listAttendanceByDate(date?: string, slot?: AttendanceSlot) {
    return this.repository.listAttendanceByDate(date, slot);
  }

  async logWalkIn(input: LogWalkInInput) {
    return this.repository.logWalkIn(input);
  }

  async updateWalkIn(walkInId: string, input: UpdateWalkInInput) {
    return this.repository.updateWalkIn(walkInId, input);
  }

  async deleteWalkIn(walkInId: string) {
    return this.repository.deleteWalkIn(walkInId);
  }

  async listWalkInsByDate(date?: string) {
    return this.repository.listWalkInsByDate(date);
  }

  async getDashboardSummary(date?: string, month?: string) {
    return this.repository.getDashboardSummary(date, month);
  }

  async answerQuery(query: string) {
    return this.repository.answerQuery(query);
  }
}

export const messService = new MessService();
export type { AttendanceSlot, PaymentMode, PaymentStatus, PlanType };
