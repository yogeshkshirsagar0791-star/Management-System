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
import { env } from '../config/env.js';

export class MessService {
  private readonly primaryRepository = env.databaseUrl ? prismaMessRepository : memoryMessRepository;

  async listCustomers(search?: string) {
    return this.primaryRepository.listCustomers(search);
  }

  async getCustomerByMessNumber(messNumber: string) {
    return this.primaryRepository.getCustomerByMessNumber(messNumber);
  }

  async createCustomer(input: CreateCustomerInput) {
    return this.primaryRepository.createCustomer(input);
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput) {
    return this.primaryRepository.updateCustomer(customerId, input);
  }

  async deleteCustomer(customerId: string) {
    return this.primaryRepository.deleteCustomer(customerId);
  }

  async listPayments() {
    return this.primaryRepository.listPayments();
  }

  async recordPayment(input: RecordPaymentInput) {
    return this.primaryRepository.recordPayment(input);
  }

  async updatePayment(paymentId: string, input: UpdatePaymentInput) {
    return this.primaryRepository.updatePayment(paymentId, input);
  }

  async deletePayment(paymentId: string) {
    return this.primaryRepository.deletePayment(paymentId);
  }

  async listDefaulters(month?: string) {
    return this.primaryRepository.listDefaulters(month);
  }

  async getMonthlyResetSummary(month?: string) {
    return this.primaryRepository.getMonthlyResetSummary(month);
  }

  async markAttendance(input: MarkAttendanceInput) {
    return this.primaryRepository.markAttendance(input);
  }

  async listAttendanceByDate(date?: string, slot?: AttendanceSlot) {
    return this.primaryRepository.listAttendanceByDate(date, slot);
  }

  async logWalkIn(input: LogWalkInInput) {
    return this.primaryRepository.logWalkIn(input);
  }

  async updateWalkIn(walkInId: string, input: UpdateWalkInInput) {
    return this.primaryRepository.updateWalkIn(walkInId, input);
  }

  async deleteWalkIn(walkInId: string) {
    return this.primaryRepository.deleteWalkIn(walkInId);
  }

  async listWalkInsByDate(date?: string) {
    return this.primaryRepository.listWalkInsByDate(date);
  }

  async getDashboardSummary(date?: string, month?: string) {
    return this.primaryRepository.getDashboardSummary(date, month);
  }

  async answerQuery(query: string) {
    return this.primaryRepository.answerQuery(query);
  }
}

export const messService = new MessService();
export type { AttendanceSlot, PaymentMode, PaymentStatus, PlanType };
