import { randomUUID } from 'node:crypto';
import type {
  AttendanceRecord,
  AttendanceSlot,
  Customer,
  DashboardSummary,
  PaymentMode,
  PaymentRecord,
  PaymentStatus,
  PlanType,
  WalkInRecord,
} from '@mess/shared';
import type {
  CreateCustomerInput,
  LogWalkInInput,
  MarkAttendanceInput,
  MessRepository,
  MonthlyResetSummary,
  RecordPaymentInput,
  UpdatePaymentInput,
  UpdateWalkInInput,
  UpdateCustomerInput,
} from '../../domain/messRepository.js';

const organizationId = 'org-demo';

function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function isoMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

function getWalkInPlateRate(date: string): number {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 ? 100 : 90;
}

function calculateWalkInAmount(date: string, customerCount: number): number {
  return customerCount * getWalkInPlateRate(date);
}

function calculateSubscriptionEndDate(startDate: string): string {
  const [year, month, day] = startDate.split('-').map(Number);
  if (!year || !month || !day) {
    return startDate;
  }

  const endDate = new Date(Date.UTC(year, month - 1, day));
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  endDate.setUTCDate(endDate.getUTCDate() - 1);

  return endDate.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function buildCustomer(
  name: string,
  phone: string,
  planType: PlanType,
  monthlySubscription: number,
  messNumber: string,
  subscriptionStartDate: string,
  subscriptionEndDate: string,
): Customer {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    organizationId,
    messNumber,
    name,
    phone,
    planType,
    active: true,
    monthlySubscription,
    subscriptionStartDate,
    subscriptionEndDate,
    createdAt: now,
    updatedAt: now,
  };
}

const customers: Customer[] = Array.from({ length: 300 }, (_, index) => {
  const messNumber = String(index + 1).padStart(3, '0');
  const cycleDate = new Date(2025, index % 12, 1);
  const startDate = startOfMonth(cycleDate);
  const endDate = endOfMonth(cycleDate);
  const planType: PlanType = index % 4 === 0 ? 'non-veg' : 'veg';
  const monthlySubscription = planType === 'veg' ? 3200 : 3800;

  return buildCustomer(
    `Subscriber ${messNumber}`,
    `+91-9000${String(index + 1).padStart(6, '0')}`,
    planType,
    monthlySubscription,
    messNumber,
    isoDate(startDate),
    isoDate(endDate),
  );
});

const payments: PaymentRecord[] = [
  {
    id: randomUUID(),
    organizationId,
    customerId: customers[0]!.id,
    month: isoMonth(),
    amount: 3200,
    status: 'paid',
    recordedAt: new Date().toISOString(),
    method: 'upi',
  },
  {
    id: randomUUID(),
    organizationId,
    customerId: customers[1]!.id,
    month: isoMonth(),
    amount: 3800,
    status: 'pending',
    recordedAt: new Date().toISOString(),
    method: 'cash',
  },
];

const attendance: AttendanceRecord[] = [
  {
    id: randomUUID(),
    organizationId,
    customerId: customers[0]!.id,
    date: isoDate(),
    slot: 'breakfast',
    present: true,
  },
  {
    id: randomUUID(),
    organizationId,
    customerId: customers[1]!.id,
    date: isoDate(),
    slot: 'breakfast',
    present: true,
  },
  {
    id: randomUUID(),
    organizationId,
    customerId: customers[2]!.id,
    date: isoDate(),
    slot: 'lunch',
    present: true,
  },
];

const walkIns: WalkInRecord[] = [
  {
    id: randomUUID(),
    organizationId,
    date: isoDate(),
    slot: 'dinner',
    customerCount: 6,
    planType: 'non-veg',
    amount: 1800,
    paymentMode: 'cash',
  },
];

export class MemoryMessRepository implements MessRepository {
  async listCustomers(search?: string): Promise<Customer[]> {
    const normalized = search?.trim().toLowerCase();
    if (!normalized) {
      return [...customers];
    }

    return customers.filter((customer) => {
      return [customer.messNumber, customer.name, customer.phone]
        .some((value) => value.toLowerCase().includes(normalized));
    });
  }

  async getCustomerByMessNumber(messNumber: string): Promise<Customer | undefined> {
    return customers.find((candidate) => candidate.messNumber === messNumber.padStart(3, '0'));
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const now = new Date().toISOString();
    const nextMessNumber = String(Math.max(0, ...customers.map((customer) => Number(customer.messNumber))) + 1).padStart(3, '0');
    const subscriptionStartDate = input.subscriptionStartDate ?? isoDate(new Date());
    const subscriptionEndDate = input.subscriptionEndDate ?? calculateSubscriptionEndDate(subscriptionStartDate);
    const customer: Customer = {
      id: randomUUID(),
      organizationId,
      messNumber: nextMessNumber,
      name: input.name,
      phone: input.phone,
      planType: input.planType,
      active: true,
      monthlySubscription: input.monthlySubscription,
      subscriptionStartDate,
      subscriptionEndDate,
      createdAt: now,
      updatedAt: now,
    };

    customers.push(customer);
    return customer;
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<Customer | undefined> {
    const customer = customers.find((candidate) => candidate.id === customerId);
    if (!customer) {
      return undefined;
    }

    if (input.name !== undefined) customer.name = input.name;
    if (input.phone !== undefined) customer.phone = input.phone;
    if (input.planType !== undefined) customer.planType = input.planType;
    if (input.monthlySubscription !== undefined) customer.monthlySubscription = input.monthlySubscription;
    if (input.subscriptionStartDate !== undefined) {
      customer.subscriptionStartDate = input.subscriptionStartDate;
      if (input.subscriptionEndDate === undefined) {
        customer.subscriptionEndDate = calculateSubscriptionEndDate(input.subscriptionStartDate);
      }
    }
    if (input.subscriptionEndDate !== undefined) customer.subscriptionEndDate = input.subscriptionEndDate;
    if (input.active !== undefined) customer.active = input.active;

    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  async deleteCustomer(customerId: string): Promise<boolean> {
    const index = customers.findIndex((candidate) => candidate.id === customerId);
    if (index === -1) {
      return false;
    }

    customers.splice(index, 1);
    return true;
  }

  async listPayments(): Promise<PaymentRecord[]> {
    return [...payments];
  }

  async recordPayment(input: RecordPaymentInput): Promise<PaymentRecord> {
    const payment: PaymentRecord = {
      id: randomUUID(),
      organizationId,
      customerId: input.customerId,
      month: input.month ?? isoMonth(),
      amount: input.amount,
      status: input.status,
      recordedAt: new Date().toISOString(),
      method: input.method,
    };

    payments.push(payment);
    return payment;
  }

  async updatePayment(paymentId: string, input: UpdatePaymentInput): Promise<PaymentRecord | undefined> {
    const payment = payments.find((candidate) => candidate.id === paymentId);
    if (!payment) {
      return undefined;
    }

    if (input.customerId !== undefined) payment.customerId = input.customerId;
    if (input.amount !== undefined) payment.amount = input.amount;
    if (input.status !== undefined) payment.status = input.status;
    if (input.method !== undefined) payment.method = input.method;
    if (input.month !== undefined) payment.month = input.month;

    return payment;
  }

  async deletePayment(paymentId: string): Promise<boolean> {
    const index = payments.findIndex((candidate) => candidate.id === paymentId);
    if (index === -1) {
      return false;
    }

    payments.splice(index, 1);
    return true;
  }

  async listDefaulters(month = isoMonth()): Promise<Customer[]> {
    const paidCustomerIds = new Set(
      payments.filter((payment) => payment.month === month && payment.status === 'paid').map((payment) => payment.customerId),
    );

    return customers.filter((customer) => customer.active && !paidCustomerIds.has(customer.id));
  }

  async getMonthlyResetSummary(month = isoMonth()): Promise<MonthlyResetSummary> {
    const paidCustomerIds = new Set(
      payments.filter((payment) => payment.month === month && payment.status === 'paid').map((payment) => payment.customerId),
    );
    const defaulters = await this.listDefaulters(month);

    return {
      month,
      totalCustomers: customers.filter((customer) => customer.active).length,
      paidCount: paidCustomerIds.size,
      pendingCount: defaulters.length,
      defaulters,
    };
  }

  async markAttendance(input: MarkAttendanceInput): Promise<AttendanceRecord> {
    const date = input.date ?? isoDate();
    const existing = attendance.find(
      (record) => record.customerId === input.customerId && record.date === date && record.slot === input.slot,
    );

    if (existing) {
      existing.present = input.present;
      return existing;
    }

    const attendanceRecord: AttendanceRecord = {
      id: randomUUID(),
      organizationId,
      customerId: input.customerId,
      date,
      slot: input.slot,
      present: input.present,
    };

    attendance.push(attendanceRecord);
    return attendanceRecord;
  }

  async listAttendanceByDate(date?: string, slot?: AttendanceSlot): Promise<AttendanceRecord[]> {
    return attendance
      .filter((record) => (date ? record.date === date : true))
      .filter((record) => (slot ? record.slot === slot : true))
      .slice()
      .sort((a, b) => `${b.date}-${b.slot}-${b.id}`.localeCompare(`${a.date}-${a.slot}-${a.id}`));
  }

  async logWalkIn(input: LogWalkInInput): Promise<WalkInRecord> {
    const date = input.date ?? isoDate();
    const walkIn: WalkInRecord = {
      id: randomUUID(),
      organizationId,
      date,
      slot: input.slot,
      customerCount: input.customerCount,
      planType: input.planType,
      amount: calculateWalkInAmount(date, input.customerCount),
      paymentMode: input.paymentMode,
    };

    walkIns.push(walkIn);
    return walkIn;
  }

  async updateWalkIn(walkInId: string, input: UpdateWalkInInput): Promise<WalkInRecord | undefined> {
    const walkIn = walkIns.find((candidate) => candidate.id === walkInId);
    if (!walkIn) {
      return undefined;
    }

    if (input.date !== undefined) walkIn.date = input.date;
    if (input.slot !== undefined) walkIn.slot = input.slot;
    if (input.customerCount !== undefined) walkIn.customerCount = input.customerCount;
    if (input.planType !== undefined) walkIn.planType = input.planType;
    if (input.paymentMode !== undefined) walkIn.paymentMode = input.paymentMode;
    walkIn.amount = calculateWalkInAmount(walkIn.date, walkIn.customerCount);

    return walkIn;
  }

  async deleteWalkIn(walkInId: string): Promise<boolean> {
    const index = walkIns.findIndex((candidate) => candidate.id === walkInId);
    if (index === -1) {
      return false;
    }

    walkIns.splice(index, 1);
    return true;
  }

  async listWalkInsByDate(date = isoDate()): Promise<WalkInRecord[]> {
    return walkIns.filter((record) => record.date === date);
  }

  async getDashboardSummary(date = isoDate(), month = isoMonth()): Promise<DashboardSummary> {
    const dailyAttendanceRecords = attendance.filter((record) => record.date === date && record.present);
    const todaysWalkIns = walkIns.filter((record) => record.date === date);
    const todaysPayments = payments.filter((record) => record.month === month && record.status === 'paid');
    const pendingPayments = (await this.listDefaulters(month)).length;

    const vegMeals =
      dailyAttendanceRecords.filter((record) => customers.find((customer) => customer.id === record.customerId)?.planType === 'veg').length +
      todaysWalkIns.filter((record) => record.planType === 'veg').reduce((sum, record) => sum + record.customerCount, 0);
    const nonVegMeals =
      dailyAttendanceRecords.filter((record) => customers.find((customer) => customer.id === record.customerId)?.planType === 'non-veg').length +
      todaysWalkIns.filter((record) => record.planType === 'non-veg').reduce((sum, record) => sum + record.customerCount, 0);

    return {
      totalCustomers: customers.length,
      totalRevenue: todaysPayments.reduce((sum, payment) => sum + payment.amount, 0),
      pendingPayments,
      dailyAttendance: dailyAttendanceRecords.length,
      dailyMealCount: vegMeals + nonVegMeals,
      vegMeals,
      nonVegMeals,
      walkInRevenue: todaysWalkIns.reduce((sum, record) => sum + record.amount, 0),
    };
  }

  async answerQuery(query: string): Promise<string> {
    const normalized = query.toLowerCase();

    if (normalized.includes('who has not paid')) {
      const names = (await this.listDefaulters()).map((customer) => customer.name);
      return names.length > 0 ? `Defaulters this month: ${names.join(', ')}.` : 'Everyone has paid this month.';
    }

    if (normalized.includes('how many meals') || normalized.includes('meals were consumed')) {
      const summary = await this.getDashboardSummary();
      return `Today ${summary.dailyMealCount} meals were consumed (${summary.vegMeals} veg, ${summary.nonVegMeals} non-veg).`;
    }

    if (normalized.includes('today') && normalized.includes('revenue')) {
      const summary = await this.getDashboardSummary();
      return `Today's revenue is ${summary.totalRevenue + summary.walkInRevenue}.`;
    }

    return 'I can answer questions about defaulters, meal counts, and revenue using the mess database.';
  }
}

export const memoryMessRepository = new MemoryMessRepository();
