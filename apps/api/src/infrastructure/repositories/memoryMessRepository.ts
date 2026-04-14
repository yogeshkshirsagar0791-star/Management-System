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

const randomUUID = () => globalThis.crypto.randomUUID();
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

const customers: Customer[] = [];
const payments: PaymentRecord[] = [];
const attendance: AttendanceRecord[] = [];
const walkIns: WalkInRecord[] = [];

const firstNames = [
  'Raj', 'Arjun', 'Vikram', 'Anil', 'Rajesh', 'Kumar', 'Sanjay', 'Pradeep',
  'Amit', 'Rohan', 'Nikhil', 'Ashok', 'Manoj', 'Dhruv', 'Anand', 'Ramesh',
  'Suresh', 'Harish', 'Pavan', 'Kapil', 'Ajay', 'Bhavesh', 'Chirag', 'Deepak',
  'Eshan', 'Faisal', 'Gaurav', 'Harsh', 'Ishaan', 'Jatin', 'Karan', 'Lalit',
  'Manish', 'Naveen', 'Omkar', 'Pranav', 'Qureshi', 'Rishi', 'Sameer', 'Tarun',
  'Uday', 'Varun', 'Wasim', 'Yadav', 'Zain', 'Anmol', 'Ishan', 'Shiva',
];

const lastNames = [
  'Sharma', 'Singh', 'Patel', 'Gupta', 'Kumar', 'Reddy', 'Verma', 'Jain',
  'Mishra', 'Rao', 'Chawla', 'Bhat', 'Nair', 'Iyer', 'Desai', 'Kulkarni',
  'Menon', 'Bhatnagar', 'Srivastava', 'Malhotra', 'Pandey', 'Agarwal', 'Trivedi',
];

function seedRealisticDataset() {
  const baseDate = new Date('2026-02-01');
  
  // Generate 85 realistic customers
  for (let i = 1; i <= 85; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const monthlySubscription = [400, 450, 500, 550, 600][Math.floor(Math.random() * 5)] || 500;
    
    const subscriptionStart = addDays(baseDate, Math.floor(Math.random() * -60));
    const subscriptionStartDate = subscriptionStart.toISOString().slice(0, 10);
    const subscriptionEndDate = calculateSubscriptionEndDate(subscriptionStartDate);
    
    const customer: Customer = {
      id: randomUUID(),
      organizationId,
      messNumber: String(i).padStart(3, '0'),
      name: `${firstName} ${lastName}`,
      phone: String(9000000000 + i * 13 + Math.floor(Math.random() * 1000)),
      planType: 'veg',
      active: Math.random() > 0.1,
      monthlySubscription,
      subscriptionStartDate,
      subscriptionEndDate,
      createdAt: subscriptionStartDate,
      updatedAt: new Date().toISOString(),
    };
    customers.push(customer);
  }

  // Generate payment history
  customers.forEach((customer) => {
    const monthsBack = 3;
    let currentMonth = new Date(baseDate);
    
    for (let m = 0; m < monthsBack; m++) {
      const monthStr = currentMonth.toISOString().slice(0, 7);
      const amount = customer.monthlySubscription + (Math.random() > 0.7 ? 50 : 0);
      const method: PaymentMode | 'bank' = ['cash', 'upi', 'bank'][Math.floor(Math.random() * 3)] as PaymentMode | 'bank';
      const recordedAt = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 10 + Math.floor(Math.random() * 15)).toISOString();
      
      payments.push({
        id: randomUUID(),
        organizationId,
        customerId: customer.id,
        month: monthStr,
        amount,
        status: 'paid',
        recordedAt,
        method,
      });
      
      currentMonth.setMonth(currentMonth.getMonth() - 1);
    }
  });

  // Generate attendance records
  customers.forEach((customer) => {
    if (!customer.active) return;
    
    let currentDate = addDays(new Date(baseDate), -60);
    const endDate = new Date();
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      
      // Skip Sundays (1 in 7 days is Sunday)
      if (dayOfWeek !== 0) {
        const isPresent = Math.random() > 0.15; // 85% attendance
        
        if (isPresent) {
          const slot: AttendanceSlot = dayOfWeek === 6 ? 'lunch' : ['lunch', 'dinner'][Math.floor(Math.random() * 2)] as AttendanceSlot;
          
          attendance.push({
            id: randomUUID(),
            organizationId,
            customerId: customer.id,
            date: currentDate.toISOString().slice(0, 10),
            slot,
            present: true,
          });
        }
      }
      
      currentDate = addDays(currentDate, 1);
    }
  });

  // Generate walk-in records
  const walkInDates = [];
  let walkInDate = addDays(new Date(baseDate), -30);
  const walkInEnd = new Date();
  
  while (walkInDate <= walkInEnd) {
    if (walkInDate.getDay() !== 0) {
      walkInDates.push(walkInDate.toISOString().slice(0, 10));
    }
    walkInDate = addDays(walkInDate, 1);
  }

  walkInDates.forEach((date) => {
    const customerCountRange = [4, 5, 6, 7, 8, 9, 10][Math.floor(Math.random() * 7)] || 6;
    const slot: AttendanceSlot = ['lunch', 'dinner'][Math.floor(Math.random() * 2)] as AttendanceSlot;
    const plateRate = new Date(date).getDay() === 0 ? 100 : 90;
    
    walkIns.push({
      id: randomUUID(),
      organizationId,
      date,
      slot,
      customerCount: customerCountRange,
      planType: 'veg',
      amount: customerCountRange * plateRate,
      paymentMode: ['cash', 'upi'][Math.floor(Math.random() * 2)] as PaymentMode,
    });
  });
}

seedRealisticDataset();

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
