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

function seedApril2026Data() {
  if (customers.length > 0) {
    return;
  }

  const seededCustomers: Array<{
    messNumber: string;
    name: string;
    phone: string;
    planType: PlanType;
    monthlySubscription: number;
    subscriptionStartDate: string;
    subscriptionEndDate: string;
  }> = [];

  const seededNames = [
    'Aman Kumar', 'Priya Sharma', 'Farhan Ali', 'Sneha Patil', 'Rohan Das',
    'Nisha Verma', 'Karthik Reddy', 'Anjali Gupta', 'Vikram Singh', 'Meera Iyer',
    'Sahil Khan', 'Pooja Nair', 'Arjun Mehta', 'Kavya Joshi', 'Imran Shaikh',
    'Neha Bansal', 'Rahul Choudhary', 'Divya Menon', 'Aditya Rao', 'Simran Kaur',
    'Manish Yadav', 'Ayesha Siddiqui', 'Harsh Vora', 'Tanvi Kulkarni', 'Ritesh Jain',
    'Bhavna Mishra', 'Rajat Malhotra', 'Sana Mirza', 'Lokesh Tiwari', 'Ishita Sen',
    'Pranav Naidu', 'Deepika Arora', 'Nitin Sahu', 'Swati Pillai', 'Akash Bhat',
    'Madhuri Ghosh', 'Yash Kapoor', 'Riya Dutta', 'Abhishek Solanki', 'Komal Agarwal',
    'Naveen Prasad', 'Shreya Paul', 'Faiz Alam', 'Trisha Roy', 'Varun Kulshrestha',
    'Payal Deshmukh', 'Jatin Bedi', 'Anamika Sethi', 'Uday Shetty', 'Monika Rawat',
  ];

  for (let index = 0; index < seededNames.length; index += 1) {
    const serial = index + 1;
    const messNumber = String(serial).padStart(3, '0');
    const planType: PlanType = serial % 3 === 0 ? 'non-veg' : 'veg';
    const joiningDay = ((serial * 7) % 25) + 1;
    const subscriptionSpanDays = 14 + ((serial * 5) % 22);
    const joiningDate = new Date(Date.UTC(2026, 3, joiningDay));
    const endingDate = new Date(joiningDate);
    endingDate.setUTCDate(endingDate.getUTCDate() + subscriptionSpanDays);

    seededCustomers.push({
      messNumber,
      name: seededNames[index]!,
      phone: `+91-987650${String(serial).padStart(4, '0')}`,
      planType,
      monthlySubscription: planType === 'non-veg' ? 3800 : 3200,
      subscriptionStartDate: joiningDate.toISOString().slice(0, 10),
      subscriptionEndDate: endingDate.toISOString().slice(0, 10),
    });
  }

  const createdCustomerMap = new Map<string, Customer>();

  for (const entry of seededCustomers) {
    const customer: Customer = {
      id: randomUUID(),
      organizationId,
      messNumber: entry.messNumber,
      name: entry.name,
      phone: entry.phone,
      planType: entry.planType,
      active: true,
      monthlySubscription: entry.monthlySubscription,
      subscriptionStartDate: entry.subscriptionStartDate,
      subscriptionEndDate: entry.subscriptionEndDate,
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-01T08:00:00.000Z',
    };

    customers.push(customer);
    createdCustomerMap.set(entry.messNumber, customer);
  }

  const seededPayments: Array<{
    messNumber: string;
    month: string;
    amount: number;
    status: PaymentStatus;
    method: PaymentMode | 'bank';
    recordedAt: string;
  }> = [];

  const paymentModes: Array<PaymentMode | 'bank'> = ['upi', 'cash', 'bank'];
  for (let index = 0; index < seededCustomers.length; index += 1) {
    const customer = seededCustomers[index]!;
    const serial = index + 1;
    const joiningDay = Number(customer.subscriptionStartDate.slice(-2));
    const day = Math.min(30, joiningDay + (serial % 6));
    const hour = 8 + (serial % 5);
    const minute = (serial * 7) % 60;

    seededPayments.push({
      messNumber: customer.messNumber,
      month: '2026-04',
      amount: customer.monthlySubscription,
      status: serial % 4 === 0 ? 'pending' : 'paid',
      method: paymentModes[index % paymentModes.length]!,
      recordedAt: `2026-04-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00.000Z`,
    });
  }

  for (const entry of seededPayments) {
    const customer = createdCustomerMap.get(entry.messNumber);
    if (!customer) {
      continue;
    }

    payments.push({
      id: randomUUID(),
      organizationId,
      customerId: customer.id,
      month: entry.month,
      amount: entry.amount,
      status: entry.status,
      recordedAt: entry.recordedAt,
      method: entry.method,
    });
  }

  const attendanceDates = ['2026-04-13', '2026-04-14', '2026-04-15'];
  const attendanceSlots: AttendanceSlot[] = ['lunch', 'dinner'];

  for (const date of attendanceDates) {
    for (const slot of attendanceSlots) {
      for (const customer of customers) {
        const messSerial = Number(customer.messNumber);
        const datePart = Number(date.slice(-2));
        const slotWeight = slot === 'lunch' ? 3 : 5;
        const isAbsent = (messSerial + datePart + slotWeight) % 11 === 0;

        attendance.push({
          id: randomUUID(),
          organizationId,
          customerId: customer.id,
          date,
          slot,
          present: !isAbsent,
        });
      }
    }
  }

  walkIns.push(
    {
      id: randomUUID(),
      organizationId,
      date: '2026-04-13',
      slot: 'dinner',
      customerCount: 7,
      planType: 'non-veg',
      amount: calculateWalkInAmount('2026-04-13', 7),
      paymentMode: 'cash',
    },
    {
      id: randomUUID(),
      organizationId,
      date: '2026-04-14',
      slot: 'lunch',
      customerCount: 5,
      planType: 'veg',
      amount: calculateWalkInAmount('2026-04-14', 5),
      paymentMode: 'upi',
    },
    {
      id: randomUUID(),
      organizationId,
      date: '2026-04-15',
      slot: 'dinner',
      customerCount: 9,
      planType: 'non-veg',
      amount: calculateWalkInAmount('2026-04-15', 9),
      paymentMode: 'cash',
    },
  );
}

seedApril2026Data();

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
