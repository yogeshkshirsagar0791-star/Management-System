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

export interface UpdatePaymentInput {
  customerId?: string;
  amount?: number;
  status?: PaymentStatus;
  method?: PaymentMode | 'bank';
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

export interface UpdateWalkInInput {
  date?: string;
  slot?: AttendanceSlot;
  customerCount?: number;
  planType?: PlanType;
  amount?: number;
  paymentMode?: PaymentMode;
}

export interface MonthlyResetSummary {
  month: string;
  totalCustomers: number;
  paidCount: number;
  pendingCount: number;
  defaulters: Customer[];
}

export interface MessRepository {
  listCustomers(search?: string): Promise<Customer[]>;
  getCustomerByMessNumber(messNumber: string): Promise<Customer | undefined>;
  createCustomer(input: CreateCustomerInput): Promise<Customer>;
  updateCustomer(customerId: string, input: UpdateCustomerInput): Promise<Customer | undefined>;
  deleteCustomer(customerId: string): Promise<boolean>;
  listPayments(): Promise<PaymentRecord[]>;
  recordPayment(input: RecordPaymentInput): Promise<PaymentRecord>;
  updatePayment(paymentId: string, input: UpdatePaymentInput): Promise<PaymentRecord | undefined>;
  deletePayment(paymentId: string): Promise<boolean>;
  listDefaulters(month?: string): Promise<Customer[]>;
  getMonthlyResetSummary(month?: string): Promise<MonthlyResetSummary>;
  markAttendance(input: MarkAttendanceInput): Promise<AttendanceRecord>;
  listAttendanceByDate(date?: string, slot?: AttendanceSlot): Promise<AttendanceRecord[]>;
  logWalkIn(input: LogWalkInInput): Promise<WalkInRecord>;
  updateWalkIn(walkInId: string, input: UpdateWalkInInput): Promise<WalkInRecord | undefined>;
  deleteWalkIn(walkInId: string): Promise<boolean>;
  listWalkInsByDate(date?: string): Promise<WalkInRecord[]>;
  getDashboardSummary(date?: string, month?: string): Promise<DashboardSummary>;
  answerQuery(query: string): Promise<string>;
}
