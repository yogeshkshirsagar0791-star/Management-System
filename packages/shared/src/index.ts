export type PlanType = 'veg' | 'non-veg';
export type AttendanceSlot = 'lunch' | 'dinner';
export type PaymentStatus = 'paid' | 'pending';
export type PaymentMode = 'cash' | 'upi';

export interface OrganizationSettings {
  id: string;
  name: string;
  timezone: string;
  monthlyMealPrice: number;
  currency: string;
}

export interface Customer {
  id: string;
  organizationId: string;
  messNumber: string;
  name: string;
  phone: string;
  planType: PlanType;
  active: boolean;
  monthlySubscription: number;
  subscriptionStartDate: string;
  subscriptionEndDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  organizationId: string;
  customerId: string;
  month: string;
  amount: number;
  status: PaymentStatus;
  recordedAt: string;
  method: PaymentMode | 'bank';
}

export interface AttendanceRecord {
  id: string;
  organizationId: string;
  customerId: string;
  date: string;
  slot: AttendanceSlot;
  present: boolean;
}

export interface WalkInRecord {
  id: string;
  organizationId: string;
  date: string;
  slot: AttendanceSlot;
  customerCount: number;
  planType: PlanType;
  amount: number;
  paymentMode: PaymentMode;
}

export interface DashboardSummary {
  totalCustomers: number;
  totalRevenue: number;
  pendingPayments: number;
  dailyAttendance: number;
  dailyMealCount: number;
  vegMeals: number;
  nonVegMeals: number;
  walkInRevenue: number;
}
