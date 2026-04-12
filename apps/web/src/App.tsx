import { FormEvent, useEffect, useState } from 'react';
import type { AttendanceRecord, Customer, DashboardSummary, PaymentRecord, WalkInRecord } from '@mess/shared';
import {
  createCustomer,
  createPayment,
  deleteCustomer,
  deletePayment,
  deleteWalkIn,
  fetchAttendance,
  fetchCustomerByMessNumber,
  fetchCustomers,
  fetchDashboardSummary,
  fetchDailyReport,
  fetchEarningsReport,
  fetchMealReport,
  fetchPayments,
  fetchWalkIns,
  logWalkIn,
  markAttendance,
  updateWalkIn,
  updateCustomer,
  updatePayment,
} from './lib/api';

const emptySummary: DashboardSummary = {
  totalCustomers: 0,
  totalRevenue: 0,
  pendingPayments: 0,
  dailyAttendance: 0,
  dailyMealCount: 0,
  vegMeals: 0,
  nonVegMeals: 0,
  walkInRevenue: 0,
};

const subscriptionOffers = [
  { days: 15 as const, amount: 2000, label: '15 days - ₹2000' },
  { days: 30 as const, amount: 3000, label: '30 days - ₹3000' },
];

function getSubscriptionAmount(days: 15 | 30): number {
  return subscriptionOffers.find((offer) => offer.days === days)?.amount ?? 3000;
}

function calculateSubscriptionEndDate(startDate: string, subscriptionDays: 15 | 30): string {
  const [year, month, day] = startDate.split('-').map(Number);
  if (!year || !month || !day) {
    return startDate;
  }

  const endDate = new Date(Date.UTC(year, month - 1, day));
  endDate.setUTCDate(endDate.getUTCDate() + subscriptionDays - 1);

  return endDate.toISOString().slice(0, 10);
}

function getDurationDaysFromDates(startDate: string, endDate: string): 15 | 30 {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  const diffMs = end.getTime() - start.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  return totalDays <= 15 ? 15 : 30;
}

function getWalkInPlateRate(date: string): number {
  const day = new Date(`${date}T00:00:00`).getDay();
  return day === 0 ? 100 : 90;
}

function addDaysToDate(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  if (!year || !month || !day) {
    return date;
  }

  const next = new Date(Date.UTC(year, month - 1, day));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function calculateDateRangeDays(goingDate: string, comingDate: string): number {
  const start = new Date(`${goingDate}T00:00:00Z`);
  const end = new Date(`${comingDate}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) {
    return 0;
  }

  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

const today = new Date().toISOString().slice(0, 10);
const now = new Date();
const currentMonth = now.toISOString().slice(0, 7);
const defaultSubscriptionStart = today;
const defaultSubscriptionDays: 15 | 30 = 30;
const defaultSubscriptionEnd = calculateSubscriptionEndDate(defaultSubscriptionStart, defaultSubscriptionDays);
type ThemeName = 'light' | 'dark' | 'ocean' | 'sunset';

const themeOptions: Array<{ value: ThemeName; label: string }> = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'sunset', label: 'Sunset' },
];

export default function App() {
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [walkIns, setWalkIns] = useState<WalkInRecord[]>([]);
  const [dailyReportText, setDailyReportText] = useState('');
  const [mealReportText, setMealReportText] = useState('');
  const [earningsReportText, setEarningsReportText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeView, setActiveView] = useState<'overview' | 'customers' | 'payments' | 'attendance' | 'walk-ins' | 'dues' | 'vacations' | 'reports'>('overview');
  const [theme, setTheme] = useState<ThemeName>(() => {
    const savedTheme = localStorage.getItem('mess-theme');
    if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'ocean' || savedTheme === 'sunset') {
      return savedTheme;
    }

    return 'light';
  });

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPlan, setCustomerPlan] = useState<'veg' | 'non-veg'>('veg');
  const [subscriptionDays, setSubscriptionDays] = useState<15 | 30>(defaultSubscriptionDays);
  const [subscriptionStartDate, setSubscriptionStartDate] = useState(defaultSubscriptionStart);
  const [subscriptionEndDate, setSubscriptionEndDate] = useState(defaultSubscriptionEnd);
  const [editingCustomerId, setEditingCustomerId] = useState('');

  const [paymentCustomerId, setPaymentCustomerId] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(3200);
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank'>('upi');
  const [editingPaymentId, setEditingPaymentId] = useState('');

  const [attendanceSlot, setAttendanceSlot] = useState<'breakfast' | 'lunch' | 'dinner'>('lunch');
  const [attendanceDate, setAttendanceDate] = useState(today);
  const [presentCustomerIds, setPresentCustomerIds] = useState<string[]>([]);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [attendanceRange, setAttendanceRange] = useState<'all' | '001-100' | '101-200' | '201-300'>('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');
  const [attendanceHistoryDate, setAttendanceHistoryDate] = useState('');
  const [attendanceHistorySlot, setAttendanceHistorySlot] = useState<'all' | 'breakfast' | 'lunch' | 'dinner'>('all');
  const [attendanceHistorySearch, setAttendanceHistorySearch] = useState('');

  const [walkInDate, setWalkInDate] = useState(today);
  const [walkInSlot, setWalkInSlot] = useState<'breakfast' | 'lunch' | 'dinner'>('dinner');
  const [walkInPlan, setWalkInPlan] = useState<'veg' | 'non-veg'>('veg');
  const [walkInCount, setWalkInCount] = useState(1);
  const [walkInPaymentMode, setWalkInPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [editingWalkInId, setEditingWalkInId] = useState('');

  const [vacationCustomerId, setVacationCustomerId] = useState('');
  const [vacationGoingDate, setVacationGoingDate] = useState(today);
  const [vacationComingDate, setVacationComingDate] = useState(today);
  const [vacationReason, setVacationReason] = useState('Personal reason');

  async function loadDashboard() {
      const [summaryData, customerData, paymentData, attendanceData, walkInData] = await Promise.all([
      fetchDashboardSummary(),
      fetchCustomers(),
      fetchPayments(),
      fetchAttendance(),
      fetchWalkIns(),
    ]);

    setSummary(summaryData);
    setCustomers(customerData);
    setPayments(paymentData);
    setAttendance(attendanceData);
    setWalkIns(walkInData);
  }

  useEffect(() => {
    void (async () => {
      try {
        await loadDashboard();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const ids = attendance
      .filter((record) => record.date === attendanceDate && record.slot === attendanceSlot && record.present)
      .map((record) => record.customerId);
    setPresentCustomerIds(ids);
  }, [attendance, attendanceDate, attendanceSlot]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mess-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = setTimeout(() => {
      setSuccessMessage('');
    }, 2200);

    return () => clearTimeout(timer);
  }, [successMessage]);

  function showSuccess(message: string) {
    setSuccessMessage(message);
  }

  function toggleDarkMode() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }

  const selectedSubscriptionAmount = getSubscriptionAmount(subscriptionDays);
  const walkInPlateRate = getWalkInPlateRate(walkInDate);
  const calculatedWalkInAmount = walkInCount * walkInPlateRate;
  const vacationPeriodDays = calculateDateRangeDays(vacationGoingDate, vacationComingDate);

  async function handleCustomerSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const calculatedSubscriptionEndDate = calculateSubscriptionEndDate(subscriptionStartDate, subscriptionDays);
      const payload = {
        name: customerName,
        phone: customerPhone,
        planType: customerPlan,
        monthlySubscription: selectedSubscriptionAmount,
        subscriptionStartDate,
        subscriptionEndDate: calculatedSubscriptionEndDate,
      };

      if (editingCustomerId) {
        await updateCustomer(editingCustomerId, payload);
      } else {
        await createCustomer(payload);
      }

      setCustomerName('');
      setCustomerPhone('');
      setCustomerPlan('veg');
      setSubscriptionDays(defaultSubscriptionDays);
      setSubscriptionStartDate(defaultSubscriptionStart);
      setSubscriptionEndDate(defaultSubscriptionEnd);
      setEditingCustomerId('');
      await loadDashboard();
      showSuccess(editingCustomerId ? 'Customer updated successfully.' : 'User registered successfully.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to save customer');
    }
  }

  function beginCustomerEdit(customer: Customer) {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerPlan(customer.planType);
    const durationDays = getDurationDaysFromDates(customer.subscriptionStartDate, customer.subscriptionEndDate);
    setSubscriptionDays(durationDays);
    setSubscriptionStartDate(customer.subscriptionStartDate);
    setSubscriptionEndDate(calculateSubscriptionEndDate(customer.subscriptionStartDate, durationDays));
    setEditingCustomerId(customer.id);
  }

  function handleSubscriptionStartDateChange(startDate: string) {
    setSubscriptionStartDate(startDate);
    setSubscriptionEndDate(calculateSubscriptionEndDate(startDate, subscriptionDays));
  }

  function handleSubscriptionDaysChange(days: 15 | 30) {
    setSubscriptionDays(days);
    setSubscriptionEndDate(calculateSubscriptionEndDate(subscriptionStartDate, days));
  }

  async function handleCustomerDelete(customerId: string) {
    setError('');
    try {
      await deleteCustomer(customerId);
      if (editingCustomerId === customerId) {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerPlan('veg');
        setSubscriptionDays(defaultSubscriptionDays);
        setSubscriptionStartDate(defaultSubscriptionStart);
        setSubscriptionEndDate(defaultSubscriptionEnd);
        setEditingCustomerId('');
      }
      if (selectedCustomer?.id === customerId) {
        setSelectedCustomer(null);
      }
      await loadDashboard();
      showSuccess('Customer deleted successfully.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete customer');
    }
  }

  async function handleCustomerSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    showSuccess('Customer search applied successfully.');
  }

  async function viewCustomerProfile(customer: Customer) {
    try {
      const profile = await fetchCustomerByMessNumber(customer.messNumber);
      setSelectedCustomer(profile);
      showSuccess('Customer profile opened successfully.');
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Unable to load customer profile');
    }
  }

  async function handlePaymentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        customerId: paymentCustomerId,
        amount: paymentAmount,
        status: paymentStatus,
        method: paymentMethod,
      };

      if (editingPaymentId) {
        await updatePayment(editingPaymentId, payload);
      } else {
        await createPayment(payload);
      }

      setPaymentCustomerId('');
      setPaymentAmount(3200);
      setPaymentStatus('paid');
      setPaymentMethod('upi');
      setEditingPaymentId('');
      await loadDashboard();
      showSuccess(editingPaymentId ? 'Payment updated successfully.' : 'Payment saved successfully.');
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Unable to save payment');
    }
  }

  function beginPaymentEdit(payment: PaymentRecord) {
    setPaymentCustomerId(payment.customerId);
    setPaymentAmount(payment.amount);
    setPaymentStatus(payment.status);
    setPaymentMethod(payment.method);
    setEditingPaymentId(payment.id);
  }

  async function handlePaymentDelete(paymentId: string) {
    setError('');
    try {
      await deletePayment(paymentId);
      if (editingPaymentId === paymentId) {
        setPaymentCustomerId('');
        setPaymentAmount(3200);
        setPaymentStatus('paid');
        setPaymentMethod('upi');
        setEditingPaymentId('');
      }
      await loadDashboard();
      showSuccess('Payment deleted successfully.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete payment');
    }
  }

  async function handleAttendanceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const presentSet = new Set(presentCustomerIds);
      await Promise.all(
        customers.map((customer) =>
          markAttendance({
            customerId: customer.id,
            date: attendanceDate,
            slot: attendanceSlot,
            present: presentSet.has(customer.id),
          }),
        ),
      );
      await loadDashboard();
      showSuccess('Attendance saved successfully.');
    } catch (attendanceError) {
      setError(attendanceError instanceof Error ? attendanceError.message : 'Unable to mark attendance');
    }
  }

  function toggleCustomerPresent(customerId: string) {
    setPresentCustomerIds((current) => (
      current.includes(customerId)
        ? current.filter((id) => id !== customerId)
        : [...current, customerId]
    ));
  }

  function markAllPresent() {
    setPresentCustomerIds(customers.map((customer) => customer.id));
  }

  function clearAllPresent() {
    setPresentCustomerIds([]);
  }

  async function handleWalkInSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const payload = {
        date: walkInDate,
        slot: walkInSlot,
        customerCount: walkInCount,
        planType: walkInPlan,
        amount: calculatedWalkInAmount,
        paymentMode: walkInPaymentMode,
      };

      if (editingWalkInId) {
        await updateWalkIn(editingWalkInId, payload);
      } else {
        await logWalkIn(payload);
      }

      setWalkInSlot('dinner');
      setWalkInPlan('veg');
      setWalkInCount(1);
      setWalkInPaymentMode('cash');
      setEditingWalkInId('');
      await loadDashboard();
      showSuccess(editingWalkInId ? 'Walk-in updated successfully.' : 'Walk-in logged successfully.');
    } catch (walkInError) {
      setError(walkInError instanceof Error ? walkInError.message : 'Unable to log walk-in');
    }
  }

  function beginWalkInEdit(record: WalkInRecord) {
    setWalkInDate(record.date);
    setWalkInSlot(record.slot);
    setWalkInPlan(record.planType);
    setWalkInCount(record.customerCount);
    setWalkInPaymentMode(record.paymentMode);
    setEditingWalkInId(record.id);
  }

  async function handleWalkInDelete(walkInId: string) {
    setError('');
    try {
      await deleteWalkIn(walkInId);
      if (editingWalkInId === walkInId) {
        setWalkInSlot('dinner');
        setWalkInPlan('veg');
        setWalkInCount(1);
        setWalkInPaymentMode('cash');
        setEditingWalkInId('');
      }
      await loadDashboard();
      showSuccess('Walk-in deleted successfully.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete walk-in');
    }
  }

  const dueStudents = customers
    .map((customer) => {
      const dueDate = new Date(`${customer.subscriptionEndDate}T00:00:00`);
      const currentDate = new Date(`${today}T00:00:00`);
      const diffDays = Math.floor((dueDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      const status = diffDays < 0 ? 'due' : diffDays <= 7 ? 'near-due' : 'ok';

      return {
        ...customer,
        diffDays,
        status,
      };
    })
    .filter((customer) => customer.status !== 'ok')
    .sort((a, b) => a.diffDays - b.diffDays);

  const dueNowCount = dueStudents.filter((student) => student.status === 'due').length;
  const nearDueCount = dueStudents.filter((student) => student.status === 'near-due').length;
  const paidCustomerIdsThisMonth = new Set(
    payments
      .filter((payment) => payment.month === currentMonth && payment.status === 'paid')
      .map((payment) => payment.customerId),
  );
  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedCustomerSearch) {
      return true;
    }

    return [customer.messNumber, customer.name, customer.phone]
      .some((value) => value.toLowerCase().includes(normalizedCustomerSearch));
  });

  const attendanceCustomers = [...customers]
    .sort((a, b) => a.messNumber.localeCompare(b.messNumber))
    .filter((customer) => {
      const messNumberValue = Number(customer.messNumber);
      if (attendanceRange === '001-100' && (messNumberValue < 1 || messNumberValue > 100)) return false;
      if (attendanceRange === '101-200' && (messNumberValue < 101 || messNumberValue > 200)) return false;
      if (attendanceRange === '201-300' && (messNumberValue < 201 || messNumberValue > 300)) return false;

      if (!attendanceSearch.trim()) return true;
      const normalized = attendanceSearch.trim().toLowerCase();
      return customer.messNumber.includes(normalized) || customer.name.toLowerCase().includes(normalized);
    })
    .filter((customer) => {
      const isPresent = presentCustomerIds.includes(customer.id);
      if (attendanceFilter === 'present') return isPresent;
      if (attendanceFilter === 'absent') return !isPresent;
      return true;
    });
  const attendanceHistoryRecords = attendance
    .filter((record) => (attendanceHistoryDate ? record.date === attendanceHistoryDate : true))
    .filter((record) => (attendanceHistorySlot !== 'all' ? record.slot === attendanceHistorySlot : true))
    .filter((record) => {
      if (!attendanceHistorySearch.trim()) {
        return true;
      }

      const customer = customers.find((item) => item.id === record.customerId);
      const normalized = attendanceHistorySearch.trim().toLowerCase();
      const messNumber = customer?.messNumber.toLowerCase() ?? '';
      const name = customer?.name.toLowerCase() ?? '';

      return messNumber.includes(normalized) || name.includes(normalized);
    })
    .slice()
    .sort((a, b) => {
      if (a.present !== b.present) {
        return a.present ? -1 : 1;
      }

      return `${b.date}-${b.slot}-${b.id}`.localeCompare(`${a.date}-${a.slot}-${a.id}`);
    });
  const attendanceRate = summary.totalCustomers > 0
    ? Math.round((summary.dailyAttendance / summary.totalCustomers) * 100)
    : 0;
  const mealMixVeg = summary.dailyMealCount > 0
    ? Math.round((summary.vegMeals / summary.dailyMealCount) * 100)
    : 0;
  const mealMixNonVeg = summary.dailyMealCount > 0 ? 100 - mealMixVeg : 0;
  const totalDueRisk = dueNowCount + nearDueCount;
  const dueRiskPercent = summary.totalCustomers > 0
    ? Math.round((totalDueRisk / summary.totalCustomers) * 100)
    : 0;
  const upcomingDueStudents = dueStudents.slice(0, 6);

  async function handleDailyReport() {
    const report = await fetchDailyReport();
    setDailyReportText(`Daily report: ${report.summary.dailyMealCount} meals, ${report.attendance.length} attendance entries, ${report.walkIns.length} walk-ins.`);
    showSuccess('Daily report loaded successfully.');
  }

  async function handleMealReport() {
    const report = await fetchMealReport();
    setMealReportText(`Meals today: ${report.dailyMealCount} total (${report.vegMeals} veg, ${report.nonVegMeals} non-veg).`);
    showSuccess('Meal report loaded successfully.');
  }

  async function handleEarningsReport() {
    const report = await fetchEarningsReport();
    setEarningsReportText(`Today's earnings: ₹${report.totalRevenue} total, ₹${report.subscriptionRevenue} subscriptions, ₹${report.walkInRevenue} walk-ins.`);
    showSuccess('Earnings report loaded successfully.');
  }

  async function handleVacationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const customer = customers.find((item) => item.id === vacationCustomerId);
    if (!customer) {
      setError('Please select a valid student for vacation extension.');
      return;
    }

    if (vacationPeriodDays <= 0) {
      setError('Coming date must be same as or after going date.');
      return;
    }

    const extensionDays = vacationPeriodDays;
    const nextEndDate = addDaysToDate(customer.subscriptionEndDate, extensionDays);

    try {
      await updateCustomer(customer.id, { subscriptionEndDate: nextEndDate });
      await loadDashboard();
      setVacationGoingDate(today);
      setVacationComingDate(today);
      showSuccess(`Vacation recorded (${vacationReason}). Subscription extended to ${nextEndDate}.`);
    } catch (vacationError) {
      setError(vacationError instanceof Error ? vacationError.message : 'Unable to save vacation extension');
    }
  }

  function openPaymentForCustomer(customer: Customer) {
    setActiveView('payments');
    setPaymentCustomerId(customer.id);
    setPaymentAmount(customer.monthlySubscription);
    setPaymentStatus('paid');
    setPaymentMethod('upi');
    setEditingPaymentId('');
  }

  if (loading) {
    return <main className="shell">Loading mess dashboard...</main>;
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Mess Management System</p>
          <h1>Simple daily operations for your mess.</h1>
          <p className="hero-copy">
            Use quick sections for customers, operations, reports, and AI without scrolling through everything.
          </p>
        </div>
        <div className="hero-side">
          <div className="theme-controls corner">
            <label className="theme-select" htmlFor="theme-switcher">
              <span>Theme</span>
              <select id="theme-switcher" value={theme} onChange={(event) => setTheme(event.target.value as ThemeName)}>
                {themeOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <button type="button" className={theme === 'dark' ? 'nav-chip active' : 'nav-chip'} onClick={toggleDarkMode}>
              {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>

          <div className="hero-panel">
            <span>Today snapshot</span>
            <strong>₹{summary.totalRevenue + summary.walkInRevenue}</strong>
            <small>{summary.totalCustomers} customers · {summary.pendingPayments} pending · {summary.dailyMealCount} meals</small>
          </div>
        </div>
      </section>

      <nav className="quick-nav" aria-label="Primary sections">
        <button type="button" className={activeView === 'overview' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('overview')}>Overview</button>
        <button type="button" className={activeView === 'customers' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('customers')}>Customers</button>
        <button type="button" className={activeView === 'payments' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('payments')}>Payments</button>
        <button type="button" className={activeView === 'attendance' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('attendance')}>Attendance</button>
        <button type="button" className={activeView === 'walk-ins' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('walk-ins')}>Walk-ins</button>
        <button type="button" className={activeView === 'dues' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('dues')}>Dues</button>
        <button type="button" className={activeView === 'vacations' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('vacations')}>Vacations</button>
        <button type="button" className={activeView === 'reports' ? 'nav-chip active' : 'nav-chip'} onClick={() => setActiveView('reports')}>Reports</button>
      </nav>

      {error ? <div className="banner error">{error}</div> : null}
      {successMessage ? <div className="banner success">{successMessage}</div> : null}

      {activeView === 'overview' ? (
        <section className="content-stack">
          <section className="stats-grid compact">
            <StatCard label="Total customers" value={summary.totalCustomers} />
            <StatCard label="Pending payments" value={summary.pendingPayments} />
            <StatCard label="Today attendance" value={summary.dailyAttendance} />
            <StatCard label="Today meal count" value={summary.dailyMealCount} />
          </section>

          <article className="card overview-health">
            <div className="card-header">
              <div>
                <p className="eyebrow">Live Health</p>
                <h2>Today&apos;s operations at a glance</h2>
              </div>
            </div>
            <div className="overview-chip-row">
              <span className="overview-chip success">Attendance {attendanceRate}%</span>
              <span className="overview-chip warning">Near due {nearDueCount}</span>
              <span className="overview-chip danger">Due now {dueNowCount}</span>
              <span className="overview-chip">Walk-in revenue ₹{summary.walkInRevenue}</span>
            </div>
            <div className="overview-progress-grid">
              <div className="progress-item">
                <div className="progress-label">
                  <span>Attendance coverage</span>
                  <strong>{attendanceRate}%</strong>
                </div>
                <div className="progress-track">
                  <span className="progress-fill" style={{ width: `${attendanceRate}%` }} />
                </div>
              </div>
              <div className="progress-item">
                <div className="progress-label">
                  <span>Meal mix (veg/non-veg)</span>
                  <strong>{mealMixVeg}% / {mealMixNonVeg}%</strong>
                </div>
                <div className="progress-track split">
                  <span className="progress-fill veg" style={{ width: `${mealMixVeg}%` }} />
                  <span className="progress-fill nonveg" style={{ width: `${mealMixNonVeg}%` }} />
                </div>
              </div>
              <div className="progress-item">
                <div className="progress-label">
                  <span>Due risk</span>
                  <strong>{dueRiskPercent}%</strong>
                </div>
                <div className="progress-track">
                  <span className="progress-fill danger" style={{ width: `${dueRiskPercent}%` }} />
                </div>
              </div>
            </div>
          </article>

          <article className="card muted">
            <div className="card-header">
              <div>
                <p className="eyebrow">Upcoming Renewals</p>
                <h2>Students needing attention first</h2>
              </div>
            </div>
            {upcomingDueStudents.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mess #</th>
                      <th>Name</th>
                      <th>Due date</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingDueStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.messNumber}</td>
                        <td>{student.name}</td>
                        <td>{student.subscriptionEndDate}</td>
                        <td>{student.status === 'due' ? `Overdue by ${Math.abs(student.diffDays)} day(s)` : `${student.diffDays} day(s) left`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted-copy">No upcoming dues in the next 7 days.</p>
            )}
          </article>
        </section>
      ) : null}

      {activeView === 'customers' ? (
        <section className="content-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Customer Management</p>
                <h2>{editingCustomerId ? 'Edit customer' : 'Add customer'}</h2>
              </div>
            </div>
            <form className="form" onSubmit={handleCustomerSubmit}>
              <div className="form-row">
                <label>
                  Name
                  <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Customer name" required />
                </label>
                <label>
                  Phone
                  <input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="Phone number" required />
                </label>
                <label>
                  Plan type
                  <select value={customerPlan} onChange={(event) => setCustomerPlan(event.target.value as 'veg' | 'non-veg')}>
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-veg</option>
                  </select>
                </label>
                <label>
                  Subscription offer
                  <select value={subscriptionDays} onChange={(event) => handleSubscriptionDaysChange(Number(event.target.value) as 15 | 30)}>
                    {subscriptionOffers.map((offer) => (
                      <option key={offer.days} value={offer.days}>{offer.label}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Subscription amount
                  <input type="number" value={selectedSubscriptionAmount} readOnly required />
                </label>
                <label>
                  Subscription start date
                  <input type="date" value={subscriptionStartDate} onChange={(event) => handleSubscriptionStartDateChange(event.target.value)} required />
                </label>
                <label>
                  Subscription end date
                  <input type="date" value={subscriptionEndDate} readOnly required />
                </label>
              </div>
              <button type="submit">{editingCustomerId ? 'Update customer' : 'Save customer'}</button>
            </form>
          </article>

          <article className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Customer List</p>
                <h2>Search and quick actions</h2>
              </div>
            </div>
            <form className="form search-form" onSubmit={handleCustomerSearch}>
              <label className="search-inline">
                <span>Search by mess number, name, or phone</span>
                <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} placeholder="e.g. 003 or Subscriber 003" />
              </label>
              <button type="submit">Search</button>
            </form>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mess #</th>
                    <th>Name</th>
                    <th>Plan</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Actions</th>
                    <th>Payment ({currentMonth})</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.messNumber}</td>
                      <td>{customer.name}</td>
                      <td>{customer.planType}</td>
                      <td>{customer.subscriptionStartDate}</td>
                      <td>{customer.subscriptionEndDate}</td>
                      <td className="row-actions">
                        {!paidCustomerIdsThisMonth.has(customer.id) ? (
                          <button type="button" className="ghost-button" onClick={() => openPaymentForCustomer(customer)}>Record payment</button>
                        ) : null}
                        <button type="button" className="ghost-button" onClick={() => void viewCustomerProfile(customer)}>Profile</button>
                        <button type="button" className="ghost-button" onClick={() => beginCustomerEdit(customer)}>Edit</button>
                        <button type="button" className="ghost-button danger" onClick={() => void handleCustomerDelete(customer.id)}>Delete</button>
                      </td>
                      <td>
                        <span className={paidCustomerIdsThisMonth.has(customer.id) ? 'payment-status payment-status-done' : 'payment-status payment-status-not-done'}>
                          {paidCustomerIdsThisMonth.has(customer.id) ? 'Payment done' : 'Payment not done'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

        </section>
      ) : null}

      {activeView === 'payments' ? (
        <section className="content-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Payments</p>
                <h2>{editingPaymentId ? 'Edit payment' : 'Record payment'}</h2>
              </div>
            </div>
            <form className="form" onSubmit={handlePaymentSubmit}>
              <div className="form-row">
                <label>
                  Customer
                  <select value={paymentCustomerId} onChange={(event) => setPaymentCustomerId(event.target.value)} required>
                    <option value="">Select customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>{customer.messNumber} - {customer.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Amount
                  <input type="number" min="0" value={paymentAmount} onChange={(event) => setPaymentAmount(Number(event.target.value))} required />
                </label>
                <label>
                  Status
                  <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as 'paid' | 'pending')}>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </label>
                <label>
                  Method
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as 'cash' | 'upi' | 'bank')}>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                  </select>
                </label>
              </div>
              <button type="submit">{editingPaymentId ? 'Update payment' : 'Save payment'}</button>
            </form>
          </article>

          <article className="card muted">
            <div className="card-header">
              <div>
                <p className="eyebrow">Recent payments</p>
                <h2>Quick edit and delete</h2>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 8).map((payment) => (
                    <tr key={payment.id}>
                      <td>{payment.id.slice(0, 6)}</td>
                      <td>{customers.find((customer) => customer.id === payment.customerId)?.messNumber ?? payment.customerId}</td>
                      <td>{payment.status}</td>
                      <td>₹{payment.amount}</td>
                      <td className="row-actions">
                        <button type="button" className="ghost-button" onClick={() => beginPaymentEdit(payment)}>Edit</button>
                        <button type="button" className="ghost-button danger" onClick={() => void handlePaymentDelete(payment.id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {activeView === 'attendance' ? (
        <section className="content-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Attendance</p>
                <h2>Tap blocks to mark present</h2>
              </div>
            </div>
            <form className="form" onSubmit={handleAttendanceSubmit}>
              <div className="form-row">
                <label>
                  Date
                  <input type="date" value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} />
                </label>
                <label>
                  Slot
                  <select value={attendanceSlot} onChange={(event) => setAttendanceSlot(event.target.value as 'breakfast' | 'lunch' | 'dinner')}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </label>
              </div>
              <div className="attendance-toolbar">
                <button type="button" className="secondary-button" onClick={markAllPresent}>Mark all present</button>
                <button type="button" className="secondary-button" onClick={clearAllPresent}>Clear all</button>
                <span className="attendance-count">Present: {presentCustomerIds.length}/{customers.length}</span>
              </div>
              <div className="attendance-legend">
                <span className="legend-item"><span className="legend-dot present"></span> Present</span>
                <span className="legend-item"><span className="legend-dot absent"></span> Absent</span>
              </div>
              <div className="form-row">
                <label>
                  Search by mess # or name
                  <input
                    value={attendanceSearch}
                    onChange={(event) => setAttendanceSearch(event.target.value)}
                    placeholder="e.g. 025 or Subscriber 025"
                  />
                </label>
                <label>
                  Show blocks
                  <select value={attendanceFilter} onChange={(event) => setAttendanceFilter(event.target.value as 'all' | 'present' | 'absent')}>
                    <option value="all">All</option>
                    <option value="present">Present only</option>
                    <option value="absent">Absent only</option>
                  </select>
                </label>
                <label>
                  Mess number range
                  <select value={attendanceRange} onChange={(event) => setAttendanceRange(event.target.value as 'all' | '001-100' | '101-200' | '201-300')}>
                    <option value="all">All (001-300)</option>
                    <option value="001-100">001-100</option>
                    <option value="101-200">101-200</option>
                    <option value="201-300">201-300</option>
                  </select>
                </label>
              </div>
              <div className="attendance-grid" aria-label="Attendance blocks">
                {attendanceCustomers.map((customer) => {
                    const isPresent = presentCustomerIds.includes(customer.id);
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        className={isPresent ? 'attendance-block present' : 'attendance-block'}
                        onClick={() => toggleCustomerPresent(customer.id)}
                        aria-pressed={isPresent}
                        title={`${customer.messNumber} - ${customer.name}`}
                      >
                        <span className="attendance-number">{customer.messNumber}</span>
                      </button>
                    );
                  })}
              </div>
              <button type="submit">Save attendance for all blocks</button>
            </form>
          </article>

          <article className="card muted">
            <div className="card-header">
              <div>
                <p className="eyebrow">Attendance history</p>
                <h2>Date-wise and slot-wise records</h2>
              </div>
            </div>
            <div className="form-row">
              <label>
                Filter by date
                <input type="date" value={attendanceHistoryDate} onChange={(event) => setAttendanceHistoryDate(event.target.value)} />
              </label>
              <label>
                Filter by slot
                <select value={attendanceHistorySlot} onChange={(event) => setAttendanceHistorySlot(event.target.value as 'all' | 'breakfast' | 'lunch' | 'dinner')}>
                  <option value="all">All slots</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                </select>
              </label>
              <label>
                Search by mess # or name
                <input
                  value={attendanceHistorySearch}
                  onChange={(event) => setAttendanceHistorySearch(event.target.value)}
                  placeholder="e.g. 017 or Subscriber 017"
                />
              </label>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Mess #</th>
                    <th>Name</th>
                    <th>Present</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistoryRecords.slice(0, 300).map((record) => {
                    const customer = customers.find((item) => item.id === record.customerId);
                    return (
                      <tr key={`history-${record.id}`}>
                        <td>{record.date}</td>
                        <td>{record.slot}</td>
                        <td>{customer?.messNumber ?? record.customerId}</td>
                        <td>{customer?.name ?? 'Unknown customer'}</td>
                        <td>
                          <span className={record.present ? 'attendance-status attendance-status-yes' : 'attendance-status attendance-status-no'}>
                            {record.present ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {attendanceHistoryRecords.length === 0 ? <p className="muted-copy">No attendance records found for selected filters.</p> : null}
          </article>
        </section>
      ) : null}

      {activeView === 'walk-ins' ? (
        <section className="content-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Walk-ins</p>
                <h2>{editingWalkInId ? 'Edit walk-in' : 'Outside customers'}</h2>
              </div>
            </div>
            <form className="form" onSubmit={handleWalkInSubmit}>
              <div className="form-row">
                <label>
                  Date
                  <input type="date" value={walkInDate} onChange={(event) => setWalkInDate(event.target.value)} />
                </label>
                <label>
                  Slot
                  <select value={walkInSlot} onChange={(event) => setWalkInSlot(event.target.value as 'breakfast' | 'lunch' | 'dinner')}>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </label>
                <label>
                  Plan type
                  <select value={walkInPlan} onChange={(event) => setWalkInPlan(event.target.value as 'veg' | 'non-veg')}>
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-veg</option>
                  </select>
                </label>
                <label>
                  Customer count
                  <input type="number" min="1" value={walkInCount} onChange={(event) => setWalkInCount(Number(event.target.value))} />
                </label>
                <label>
                  Amount
                  <input type="number" min="0" value={calculatedWalkInAmount} readOnly />
                </label>
                <label>
                  Payment mode
                  <select value={walkInPaymentMode} onChange={(event) => setWalkInPaymentMode(event.target.value as 'cash' | 'upi')}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                  </select>
                </label>
              </div>
              <small>Rate applied: ₹{walkInPlateRate} per plate ({walkInPlateRate === 100 ? 'Sunday special menu' : 'Regular day'}).</small>
              <button type="submit">{editingWalkInId ? 'Update walk-in' : 'Log walk-in'}</button>
            </form>
          </article>

          <article className="card muted">
            <div className="card-header">
              <div>
                <p className="eyebrow">Walk-in History</p>
                <h2>Edit or delete logs</h2>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Slot</th>
                    <th>Plan</th>
                    <th>Count</th>
                    <th>Amount</th>
                    <th>Payment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {walkIns
                    .slice()
                    .sort((a, b) => `${b.date}-${b.id}`.localeCompare(`${a.date}-${a.id}`))
                    .map((record) => (
                      <tr key={record.id}>
                        <td>{record.date}</td>
                        <td>{record.slot}</td>
                        <td>{record.planType}</td>
                        <td>{record.customerCount}</td>
                        <td>₹{record.amount}</td>
                        <td>{record.paymentMode}</td>
                        <td className="row-actions">
                          <button type="button" className="ghost-button" onClick={() => beginWalkInEdit(record)}>Edit</button>
                          <button type="button" className="ghost-button danger" onClick={() => void handleWalkInDelete(record.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {activeView === 'dues' ? (
        <section className="content-stack">
          <article className="card muted">
            <div className="card-header">
              <div>
                <p className="eyebrow">Subscription Due Status</p>
                <h2>Students nearly due or already due</h2>
              </div>
            </div>
            <div className="assistant-answer">
              Due now: {dueNowCount} students · Near due (next 7 days): {nearDueCount} students
            </div>
            {dueStudents.length > 0 ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mess #</th>
                      <th>Name</th>
                      <th>End date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueStudents.map((student) => (
                      <tr key={student.id}>
                        <td>{student.messNumber}</td>
                        <td>{student.name}</td>
                        <td>{student.subscriptionEndDate}</td>
                        <td>{student.status === 'due' ? `Due (${Math.abs(student.diffDays)} days overdue)` : `Near due (${student.diffDays} days left)`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {dueStudents.length === 0 ? <p className="muted-copy">No students are near due or due.</p> : null}
          </article>
        </section>
      ) : null}

      {activeView === 'vacations' ? (
        <section className="content-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Vacation Extension</p>
                <h2>Extend subscription for home leave</h2>
              </div>
            </div>
            <form className="form" onSubmit={handleVacationSubmit}>
              <div className="form-row">
                <label>
                  Student
                  <select value={vacationCustomerId} onChange={(event) => setVacationCustomerId(event.target.value)} required>
                    <option value="">Select student</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.messNumber} - {customer.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Going date
                  <input type="date" value={vacationGoingDate} onChange={(event) => setVacationGoingDate(event.target.value)} required />
                </label>
                <label>
                  Coming date
                  <input type="date" value={vacationComingDate} onChange={(event) => setVacationComingDate(event.target.value)} required />
                </label>
                <label>
                  Reason
                  <input value={vacationReason} onChange={(event) => setVacationReason(event.target.value)} placeholder="Personal reason" required />
                </label>
              </div>
              <p className="vacation-period-copy">
                Vacation period days: <strong className="vacation-period-days">{vacationPeriodDays}</strong>
              </p>
              <button type="submit">Extend subscription</button>
            </form>
          </article>

          <article className="card muted">
            <div className="card-header">
              <div>
                <p className="eyebrow">Current subscription dates</p>
                <h2>Check latest end dates after extension</h2>
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Mess #</th>
                    <th>Name</th>
                    <th>Start date</th>
                    <th>End date</th>
                  </tr>
                </thead>
                <tbody>
                  {customers
                    .slice()
                    .sort((a, b) => a.messNumber.localeCompare(b.messNumber))
                    .map((customer) => (
                      <tr key={`vac-${customer.id}`}>
                        <td>{customer.messNumber}</td>
                        <td>{customer.name}</td>
                        <td>{customer.subscriptionStartDate}</td>
                        <td>{customer.subscriptionEndDate}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </article>
        </section>
      ) : null}

      {activeView === 'reports' ? (
        <section className="content-stack">
          <article className="card">
            <div className="card-header">
              <div>
                <p className="eyebrow">Reports</p>
                <h2>Daily summaries</h2>
              </div>
            </div>
            <div className="report-actions">
              <button type="button" onClick={() => void handleDailyReport()}>Load daily report</button>
              <button type="button" onClick={() => void handleMealReport()}>Load meal summary</button>
              <button type="button" onClick={() => void handleEarningsReport()}>Load earnings</button>
            </div>
            {dailyReportText ? <p className="assistant-answer">{dailyReportText}</p> : null}
            {mealReportText ? <p className="assistant-answer">{mealReportText}</p> : null}
            {earningsReportText ? <p className="assistant-answer">{earningsReportText}</p> : null}
          </article>

          <article className="card muted">
            <div className="card-header">
              <div>
                <p className="eyebrow">Meal split</p>
                <h2>Quick numbers</h2>
              </div>
            </div>
            <div className="stats-grid compact">
              <StatCard label="Veg meals" value={summary.vegMeals} />
              <StatCard label="Non-veg meals" value={summary.nonVegMeals} />
            </div>
          </article>
        </section>
      ) : null}

    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
