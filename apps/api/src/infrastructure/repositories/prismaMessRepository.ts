import type {
  AttendanceRecord,
  AttendanceSlot,
  Customer,
  DashboardSummary,
  PaymentRecord,
  PaymentStatus,
  PlanType,
  WalkInRecord,
} from '@mess/shared';
import { prisma } from '../prisma/prismaClient.js';
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

function parseDateOnlyToUtc(dateOnly?: string): Date | undefined {
  if (!dateOnly) {
    return undefined;
  }

  const [year, month, day] = dateOnly.split('-').map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(Date.UTC(year, month - 1, day));
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

function mapCustomer(record: {
  id: string;
  organizationId: string;
  messNumber: string;
  name: string;
  phone: string;
  planType: string;
  active: boolean;
  monthlySubscription: number;
  createdAt: Date;
  updatedAt: Date;
}): Customer {
  const subscriptionStartDate = isoDate(record.createdAt);
  const subscriptionEndDate = calculateSubscriptionEndDate(subscriptionStartDate);

  return {
    ...record,
    planType: record.planType as PlanType,
    subscriptionStartDate,
    subscriptionEndDate,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapPayment(record: {
  id: string;
  organizationId: string;
  customerId: string;
  month: string;
  amount: number;
  status: string;
  recordedAt: Date;
  method: string;
}): PaymentRecord {
  return {
    ...record,
    status: record.status as PaymentStatus,
    method: record.method as PaymentRecord['method'],
    recordedAt: record.recordedAt.toISOString(),
  };
}

function mapAttendance(record: {
  id: string;
  organizationId: string;
  customerId: string;
  date: string;
  slot: string;
  present: boolean;
}): AttendanceRecord {
  return {
    ...record,
    slot: record.slot as AttendanceSlot,
  };
}

function mapWalkIn(record: {
  id: string;
  organizationId: string;
  date: string;
  slot: string;
  customerCount: number;
  planType: string;
  amount: number;
  paymentMode: string;
  createdAt: Date;
}): WalkInRecord {
  return {
    ...record,
    planType: record.planType as PlanType,
    paymentMode: record.paymentMode as WalkInRecord['paymentMode'],
    createdAt: record.createdAt.toISOString(),
  } as WalkInRecord;
}

export class PrismaMessRepository implements MessRepository {
  async listCustomers(search?: string): Promise<Customer[]> {
    const normalized = search?.trim();
    const customers = await prisma.customer.findMany({
      where: normalized
        ? {
            organizationId,
            OR: [
              { messNumber: { contains: normalized, mode: 'insensitive' } },
              { name: { contains: normalized, mode: 'insensitive' } },
              { phone: { contains: normalized } },
            ],
          }
        : { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    return customers.map(mapCustomer);
  }

  async getCustomerByMessNumber(messNumber: string): Promise<Customer | undefined> {
    const customer = await prisma.customer.findFirst({ where: { organizationId, messNumber: messNumber.padStart(3, '0') } });
    return customer ? mapCustomer(customer) : undefined;
  }

  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    const lastCustomer = await prisma.customer.findFirst({
      where: { organizationId },
      orderBy: { messNumber: 'desc' },
      select: { messNumber: true },
    });
    const nextMessNumber = String(Number(lastCustomer?.messNumber ?? '0') + 1).padStart(3, '0');

    const customer = await prisma.customer.create({
      data: {
        organizationId,
        messNumber: nextMessNumber,
        name: input.name,
        phone: input.phone,
        planType: input.planType,
        active: true,
        monthlySubscription: input.monthlySubscription,
        createdAt: parseDateOnlyToUtc(input.subscriptionStartDate),
      },
    });

    return mapCustomer(customer);
  }

  async updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<Customer | undefined> {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId } });
    if (!customer) {
      return undefined;
    }

    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: input.name,
        phone: input.phone,
        planType: input.planType,
        monthlySubscription: input.monthlySubscription,
        active: input.active,
        createdAt: parseDateOnlyToUtc(input.subscriptionStartDate),
      },
    });

    return mapCustomer(updated);
  }

  async deleteCustomer(customerId: string): Promise<boolean> {
    const customer = await prisma.customer.findFirst({ where: { id: customerId, organizationId } });
    if (!customer) {
      return false;
    }

    await prisma.customer.delete({ where: { id: customerId } });
    return true;
  }

  async listPayments(): Promise<PaymentRecord[]> {
    const payments = await prisma.payment.findMany({ where: { organizationId }, orderBy: { recordedAt: 'desc' } });
    return payments.map(mapPayment);
  }

  async recordPayment(input: RecordPaymentInput): Promise<PaymentRecord> {
    const payment = await prisma.payment.create({
      data: {
        organizationId,
        customerId: input.customerId,
        month: input.month ?? isoMonth(),
        amount: input.amount,
        status: input.status,
        method: input.method,
      },
    });

    return mapPayment(payment);
  }

  async updatePayment(paymentId: string, input: UpdatePaymentInput): Promise<PaymentRecord | undefined> {
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, organizationId } });
    if (!payment) {
      return undefined;
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        customerId: input.customerId,
        amount: input.amount,
        status: input.status,
        method: input.method,
        month: input.month,
      },
    });

    return mapPayment(updated);
  }

  async deletePayment(paymentId: string): Promise<boolean> {
    const payment = await prisma.payment.findFirst({ where: { id: paymentId, organizationId } });
    if (!payment) {
      return false;
    }

    await prisma.payment.delete({ where: { id: paymentId } });
    return true;
  }

  async listDefaulters(month = isoMonth()): Promise<Customer[]> {
    const paidCustomerIds = await prisma.payment.findMany({
      where: { organizationId, month, status: 'paid' },
      select: { customerId: true },
    });

    const customers = await prisma.customer.findMany({
      where: {
        organizationId,
        active: true,
        NOT: { id: { in: paidCustomerIds.map((payment: { customerId: string }) => payment.customerId) } },
      },
    });

    return customers.map(mapCustomer);
  }

  async getMonthlyResetSummary(month = isoMonth()): Promise<MonthlyResetSummary> {
    const [customers, defaulters, paidPayments] = await Promise.all([
      prisma.customer.count({ where: { organizationId, active: true } }),
      this.listDefaulters(month),
      prisma.payment.findMany({ where: { organizationId, month, status: 'paid' }, select: { customerId: true } }),
    ]);

    return {
      month,
      totalCustomers: customers,
      paidCount: paidPayments.length,
      pendingCount: defaulters.length,
      defaulters,
    };
  }

  async markAttendance(input: MarkAttendanceInput): Promise<AttendanceRecord> {
    const date = input.date ?? isoDate();
    const attendance = await prisma.attendance.upsert({
      where: {
        organizationId_customerId_date_slot: {
          organizationId,
          customerId: input.customerId,
          date,
          slot: input.slot,
        },
      },
      create: {
        organizationId,
        customerId: input.customerId,
        date,
        slot: input.slot,
        present: input.present,
      },
      update: {
        present: input.present,
      },
    });

    return mapAttendance(attendance);
  }

  async listAttendanceByDate(date?: string, slot?: AttendanceSlot): Promise<AttendanceRecord[]> {
    const attendances = await prisma.attendance.findMany({
      where: {
        organizationId,
        ...(date ? { date } : {}),
        ...(slot ? { slot } : {}),
      },
      orderBy: [{ date: 'desc' }, { slot: 'asc' }],
    });
    return attendances.map(mapAttendance);
  }

  async logWalkIn(input: LogWalkInInput): Promise<WalkInRecord> {
    const date = input.date ?? isoDate();
    const walkIn = await prisma.walkIn.create({
      data: {
        organizationId,
        date,
        slot: input.slot,
        customerCount: input.customerCount,
        planType: input.planType,
        amount: calculateWalkInAmount(date, input.customerCount),
        paymentMode: input.paymentMode,
      },
    });

    return mapWalkIn(walkIn);
  }

  async updateWalkIn(walkInId: string, input: UpdateWalkInInput): Promise<WalkInRecord | undefined> {
    const walkIn = await prisma.walkIn.findFirst({ where: { id: walkInId, organizationId } });
    if (!walkIn) {
      return undefined;
    }

    const nextDate = input.date ?? walkIn.date;
    const nextCustomerCount = input.customerCount ?? walkIn.customerCount;

    const updated = await prisma.walkIn.update({
      where: { id: walkInId },
      data: {
        date: input.date,
        slot: input.slot,
        customerCount: input.customerCount,
        planType: input.planType,
        amount: calculateWalkInAmount(nextDate, nextCustomerCount),
        paymentMode: input.paymentMode,
      },
    });

    return mapWalkIn(updated);
  }

  async deleteWalkIn(walkInId: string): Promise<boolean> {
    const walkIn = await prisma.walkIn.findFirst({ where: { id: walkInId, organizationId } });
    if (!walkIn) {
      return false;
    }

    await prisma.walkIn.delete({ where: { id: walkInId } });
    return true;
  }

  async listWalkInsByDate(date = isoDate()): Promise<WalkInRecord[]> {
    const walkIns = await prisma.walkIn.findMany({ where: { organizationId, date } });
    return walkIns.map(mapWalkIn);
  }

  async getDashboardSummary(date = isoDate(), month = isoMonth()): Promise<DashboardSummary> {
    const [customers, attendance, walkIns, paidPayments, defaulters] = await Promise.all([
      prisma.customer.findMany({ where: { organizationId, active: true } }),
      prisma.attendance.findMany({ where: { organizationId, date, present: true } }),
      prisma.walkIn.findMany({ where: { organizationId, date } }),
      prisma.payment.findMany({ where: { organizationId, month, status: 'paid' } }),
      this.listDefaulters(month),
    ]);

    const customerPlanById = new Map<string, PlanType>(customers.map((customer) => [customer.id, customer.planType as PlanType] as const));
    const vegMealAttendance = attendance.reduce((count, record) => count + (customerPlanById.get(record.customerId) === 'veg' ? 1 : 0), 0);
    const nonVegMealAttendance = attendance.reduce((count, record) => count + (customerPlanById.get(record.customerId) === 'non-veg' ? 1 : 0), 0);
    const vegMealWalkIns = walkIns.reduce((count, record) => count + (record.planType === 'veg' ? record.customerCount : 0), 0);
    const nonVegMealWalkIns = walkIns.reduce((count, record) => count + (record.planType === 'non-veg' ? record.customerCount : 0), 0);
    const vegMeals = vegMealAttendance + vegMealWalkIns;
    const nonVegMeals = nonVegMealAttendance + nonVegMealWalkIns;

    return {
      totalCustomers: customers.length,
      totalRevenue: paidPayments.reduce((sum: number, payment: { amount: number }) => sum + payment.amount, 0),
      pendingPayments: defaulters.length,
      dailyAttendance: attendance.length,
      dailyMealCount: vegMeals + nonVegMeals,
      vegMeals,
      nonVegMeals,
      walkInRevenue: walkIns.reduce((sum: number, record: { amount: number }) => sum + record.amount, 0),
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

export const prismaMessRepository = new PrismaMessRepository();
