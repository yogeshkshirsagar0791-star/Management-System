import {
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

const randomUUID = () => globalThis.crypto.randomUUID();

const organizationId = 'org-demo';

function isoDate(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function isoMonth(date = new Date()): string {
  return date.toISOString().slice(0, 7);
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

function buildCustomer(name: string, phone: string, planType: PlanType, monthlySubscription: number): Customer {
  const now = new Date().toISOString();
  const startDate = isoDate(startOfMonth(new Date()));
  const endDate = isoDate(endOfMonth(new Date()));

  return {
    id: randomUUID(),
    organizationId,
    messNumber: '000',
    name,
    phone,
    planType,
    active: true,
    monthlySubscription,
    subscriptionStartDate: startDate,
    subscriptionEndDate: endDate,
    createdAt: now,
    updatedAt: now,
  };
}

export interface CreateCustomerInput {
  name: string;
  phone: string;
  planType: PlanType;
  monthlySubscription: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  planType?: PlanType;
  monthlySubscription?: number;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  active?: boolean;
}

export interface RecordPaymentInput {
  customerId: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMode | 'bank';
  month?: string;
}

export interface MarkAttendanceInput {
  customerId: string;
  date?: string;
  slot: AttendanceSlot;
  present: boolean;
}

export interface LogWalkInInput {
  date?: string;
  slot: AttendanceSlot;
  customerCount: number;
  planType: PlanType;
  amount: number;
  paymentMode: PaymentMode;
}

export interface MonthlyResetSummary {
  month: string;
  totalCustomers: number;
  paidCount: number;
  pendingCount: number;
  defaulters: Customer[];
}

const customers: Customer[] = [
  { ...buildCustomer('Aman Kumar', '+91-9000000001', 'veg', 3200), messNumber: '001' },
  { ...buildCustomer('Farhan Ali', '+91-9000000002', 'non-veg', 3800), messNumber: '002' },
  { ...buildCustomer('Priya Singh', '+91-9000000003', 'veg', 3200), messNumber: '003' },
  { ...buildCustomer('Naveen Reddy', '+91-9000000004', 'non-veg', 3800), messNumber: '004' },
];

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

export class MessStore {
  listCustomers(search?: string): Customer[] {
    const normalized = search?.trim().toLowerCase();
    if (!normalized) {
      return [...customers];
    }

    return customers.filter((customer) =>
      [customer.messNumber, customer.name, customer.phone].some((value) => value.toLowerCase().includes(normalized)),
    );
  }

  getCustomerByMessNumber(messNumber: string): Customer | undefined {
    return customers.find((candidate) => candidate.messNumber === messNumber.padStart(3, '0'));
  }

  createCustomer(input: CreateCustomerInput): Customer {
    const now = new Date().toISOString();
    const nextMessNumber = String(Math.max(0, ...customers.map((customer) => Number(customer.messNumber))) + 1).padStart(3, '0');
    const customer: Customer = {
      id: randomUUID(),
      organizationId,
      messNumber: nextMessNumber,
      name: input.name,
      phone: input.phone,
      planType: input.planType,
      active: true,
      monthlySubscription: input.monthlySubscription,
      subscriptionStartDate: input.subscriptionStartDate ?? isoDate(startOfMonth(new Date())),
      subscriptionEndDate: input.subscriptionEndDate ?? isoDate(endOfMonth(new Date())),
      createdAt: now,
      updatedAt: now,
    };

    customers.push(customer);
    return customer;
  }

  updateCustomer(customerId: string, input: UpdateCustomerInput): Customer | undefined {
    const customer = customers.find((candidate) => candidate.id === customerId);
    if (!customer) {
      return undefined;
    }

    if (input.name !== undefined) {
      customer.name = input.name;
    }
    if (input.phone !== undefined) {
      customer.phone = input.phone;
    }
    if (input.planType !== undefined) {
      customer.planType = input.planType;
    }
    if (input.monthlySubscription !== undefined) {
      customer.monthlySubscription = input.monthlySubscription;
    }
    if (input.subscriptionStartDate !== undefined) {
      customer.subscriptionStartDate = input.subscriptionStartDate;
    }
    if (input.subscriptionEndDate !== undefined) {
      customer.subscriptionEndDate = input.subscriptionEndDate;
    }
    if (input.active !== undefined) {
      customer.active = input.active;
    }

    customer.updatedAt = new Date().toISOString();
    return customer;
  }

  deleteCustomer(customerId: string): boolean {
    const index = customers.findIndex((candidate) => candidate.id === customerId);
    if (index === -1) {
      return false;
    }

    customers.splice(index, 1);
    return true;
  }

  listPayments(): PaymentRecord[] {
    return [...payments];
  }

  recordPayment(input: RecordPaymentInput): PaymentRecord {
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

  listDefaulters(month = isoMonth()): Customer[] {
    const paidCustomerIds = new Set(
      payments.filter((payment) => payment.month === month && payment.status === 'paid').map((payment) => payment.customerId),
    );

    return customers.filter((customer) => customer.active && !paidCustomerIds.has(customer.id));
  }

  getMonthlyResetSummary(month = isoMonth()): MonthlyResetSummary {
    const paidCustomerIds = new Set(
      payments.filter((payment) => payment.month === month && payment.status === 'paid').map((payment) => payment.customerId),
    );
    const defaulters = this.listDefaulters(month);

    return {
      month,
      totalCustomers: customers.filter((customer) => customer.active).length,
      paidCount: paidCustomerIds.size,
      pendingCount: defaulters.length,
      defaulters,
    };
  }

  markAttendance(input: MarkAttendanceInput): AttendanceRecord {
    const attendanceRecord: AttendanceRecord = {
      id: randomUUID(),
      organizationId,
      customerId: input.customerId,
      date: input.date ?? isoDate(),
      slot: input.slot,
      present: input.present,
    };

    attendance.push(attendanceRecord);
    return attendanceRecord;
  }

  listAttendanceByDate(date = isoDate()): AttendanceRecord[] {
    return attendance.filter((record) => record.date === date);
  }

  logWalkIn(input: LogWalkInInput): WalkInRecord {
    const walkIn: WalkInRecord = {
      id: randomUUID(),
      organizationId,
      date: input.date ?? isoDate(),
      slot: input.slot,
      customerCount: input.customerCount,
      planType: input.planType,
      amount: input.amount,
      paymentMode: input.paymentMode,
    };

    walkIns.push(walkIn);
    return walkIn;
  }

  listWalkInsByDate(date = isoDate()): WalkInRecord[] {
    return walkIns.filter((record) => record.date === date);
  }

  getDashboardSummary(date = isoDate(), month = isoMonth()): DashboardSummary {
    const dailyAttendanceRecords = attendance.filter((record) => record.date === date && record.present);
    const todaysWalkIns = walkIns.filter((record) => record.date === date);
    const todaysPayments = payments.filter((record) => record.month === month && record.status === 'paid');
    const pendingPayments = this.listDefaulters(month).length;

    const vegMeals = dailyAttendanceRecords.filter((record) => customers.find((customer) => customer.id === record.customerId)?.planType === 'veg').length
      + todaysWalkIns.filter((record) => record.planType === 'veg').reduce((sum, record) => sum + record.customerCount, 0);
    const nonVegMeals = dailyAttendanceRecords.filter((record) => customers.find((customer) => customer.id === record.customerId)?.planType === 'non-veg').length
      + todaysWalkIns.filter((record) => record.planType === 'non-veg').reduce((sum, record) => sum + record.customerCount, 0);

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

  answerQuery(query: string): string {
    const normalized = query.toLowerCase();

    if (normalized.includes('who has not paid')) {
      const names = this.listDefaulters().map((customer) => customer.name);
      return names.length > 0 ? `Defaulters this month: ${names.join(', ')}.` : 'Everyone has paid this month.';
    }

    if (normalized.includes('how many meals') || normalized.includes('meals were consumed')) {
      const summary = this.getDashboardSummary();
      return `Today ${summary.dailyMealCount} meals were consumed (${summary.vegMeals} veg, ${summary.nonVegMeals} non-veg).`;
    }

    if (normalized.includes('today') && normalized.includes('revenue')) {
      const summary = this.getDashboardSummary();
      return `Today\'s revenue is ${summary.totalRevenue + summary.walkInRevenue}.`;
    }

    return 'I can answer questions about defaulters, meal counts, and revenue using the mess database.';
  }
}

export const messStore = new MessStore();
