import type { AttendanceRecord, Customer, DashboardSummary, PaymentMode, PaymentRecord, PlanType, WalkInRecord } from '@mess/shared';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? (
  import.meta.env.PROD
    ? 'https://mess-api-q2ma.onrender.com/api'
    : 'http://localhost:3001/api'
);

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchDashboardSummary() {
  return requestJson<DashboardSummary>('/dashboard/summary');
}

export function fetchCustomers(search?: string) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return requestJson<Customer[]>(`/customers${query}`);
}

export function fetchCustomerByMessNumber(messNumber: string) {
  return requestJson<Customer>(`/customers/number/${encodeURIComponent(messNumber)}`);
}

export function fetchPayments() {
  return requestJson<PaymentRecord[]>('/payments');
}

export function createPayment(payload: { customerId: string; amount: number; status: 'paid' | 'pending'; method: PaymentMode | 'bank'; month?: string }) {
  return requestJson<PaymentRecord>('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePayment(paymentId: string, payload: Partial<{ customerId: string; amount: number; status: 'paid' | 'pending'; method: PaymentMode | 'bank'; month: string }>) {
  return requestJson<PaymentRecord>(`/payments/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePayment(paymentId: string) {
  return requestJson<void>(`/payments/${paymentId}`, {
    method: 'DELETE',
  });
}

export function fetchDefaulters(month?: string) {
  const search = month ? `?month=${encodeURIComponent(month)}` : '';
  return requestJson<Customer[]>(`/payments/defaulters${search}`);
}

export function closeMonth(month?: string) {
  return requestJson<{ month: string; totalCustomers: number; paidCount: number; pendingCount: number; defaulters: Customer[] }>('/payments/monthly-reset', {
    method: 'POST',
    body: JSON.stringify(month ? { month } : {}),
  });
}

export function fetchAttendance(date?: string, slot?: 'breakfast' | 'lunch' | 'dinner') {
  const query = new URLSearchParams();
  if (date) {
    query.set('date', date);
  }
  if (slot) {
    query.set('slot', slot);
  }

  const suffix = query.size > 0 ? `?${query.toString()}` : '';
  return requestJson<AttendanceRecord[]>(`/attendance${suffix}`);
}

export function markAttendance(payload: { customerId: string; date?: string; slot: 'breakfast' | 'lunch' | 'dinner'; present: boolean }) {
  return requestJson<AttendanceRecord>('/attendance', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchWalkIns() {
  return requestJson<WalkInRecord[]>('/walk-ins');
}

export function logWalkIn(payload: { date?: string; slot: 'breakfast' | 'lunch' | 'dinner'; customerCount: number; planType: PlanType; amount: number; paymentMode: PaymentMode }) {
  return requestJson<WalkInRecord>('/walk-ins', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWalkIn(walkInId: string, payload: Partial<{ date: string; slot: 'breakfast' | 'lunch' | 'dinner'; customerCount: number; planType: PlanType; amount: number; paymentMode: PaymentMode }>) {
  return requestJson<WalkInRecord>(`/walk-ins/${walkInId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteWalkIn(walkInId: string) {
  return requestJson<void>(`/walk-ins/${walkInId}`, {
    method: 'DELETE',
  });
}

export function createCustomer(payload: Pick<Customer, 'name' | 'phone' | 'planType' | 'monthlySubscription' | 'subscriptionStartDate' | 'subscriptionEndDate'>) {
  return requestJson<Customer>('/customers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateCustomer(customerId: string, payload: Partial<Pick<Customer, 'name' | 'phone' | 'planType' | 'monthlySubscription' | 'subscriptionStartDate' | 'subscriptionEndDate' | 'active'>>) {
  return requestJson<Customer>(`/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteCustomer(customerId: string) {
  return requestJson<void>(`/customers/${customerId}`, {
    method: 'DELETE',
  });
}

export function askAssistant(query: string) {
  return requestJson<{ answer: string }>('/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
}

export function fetchDailyReport(date?: string) {
  const search = date ? `?date=${encodeURIComponent(date)}` : '';
  return requestJson<{ date: string; summary: DashboardSummary; attendance: AttendanceRecord[]; walkIns: WalkInRecord[] }>(`/reports/daily${search}`);
}

export function fetchMealReport(date?: string) {
  const search = date ? `?date=${encodeURIComponent(date)}` : '';
  return requestJson<DashboardSummary>(`/reports/meals${search}`);
}

export function fetchEarningsReport(date?: string) {
  const search = date ? `?date=${encodeURIComponent(date)}` : '';
  return requestJson<{ date: string; totalRevenue: number; walkInRevenue: number; subscriptionRevenue: number }>(`/reports/earnings${search}`);
}
