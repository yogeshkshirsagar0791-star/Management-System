import { Router, type NextFunction, type Request, type Response } from 'express';
import { z } from 'zod';
import { aiService } from '../application/aiService.js';
import { messService } from '../application/messService.js';
import { reportService } from '../application/reportService.js';

const customerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(6),
  planType: z.enum(['veg', 'non-veg']),
  monthlySubscription: z.number().positive(),
  subscriptionStartDate: z.string().optional(),
  subscriptionEndDate: z.string().optional(),
});

const paymentSchema = z.object({
  customerId: z.string().min(1),
  amount: z.number().nonnegative(),
  status: z.enum(['paid', 'pending']),
  method: z.union([z.enum(['cash', 'upi']), z.literal('bank')]),
  month: z.string().optional(),
});

const attendanceSchema = z.object({
  customerId: z.string().min(1),
  date: z.string().optional(),
  slot: z.enum(['lunch', 'dinner']),
  present: z.boolean(),
});

const walkInSchema = z.object({
  date: z.string().optional(),
  slot: z.enum(['lunch', 'dinner']),
  customerCount: z.number().int().positive(),
  planType: z.enum(['veg', 'non-veg']),
  amount: z.number().nonnegative(),
  paymentMode: z.enum(['cash', 'upi']),
});

const aiSchema = z.object({
  query: z.string().min(1),
});

export const routes = Router();

function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
) {
  return (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response, next).catch(next);
  };
}

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

routes.get('/health', (_request: Request, response: Response) => {
  response.json({ status: 'ok', service: 'mess-api' });
});

routes.get('/dashboard/summary', asyncHandler(async (request: Request, response: Response) => {
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  const month = typeof request.query.month === 'string' ? request.query.month : undefined;
  response.json(await messService.getDashboardSummary(date, month));
}));

routes.get('/customers', asyncHandler(async (request: Request, response: Response) => {
  const search = typeof request.query.search === 'string' ? request.query.search : undefined;
  response.json(await messService.listCustomers(search));
}));

routes.get('/customers/number/:messNumber', asyncHandler(async (request: Request, response: Response) => {
  const customer = await messService.getCustomerByMessNumber(firstParam(request.params.messNumber));
  if (!customer) {
    response.status(404).json({ message: 'Customer not found' });
    return;
  }

  response.json(customer);
}));

routes.post('/customers', asyncHandler(async (request: Request, response: Response) => {
  const input = customerSchema.parse(request.body);
  response.status(201).json(await messService.createCustomer(input));
}));

routes.patch('/customers/:id', asyncHandler(async (request: Request, response: Response) => {
  const input = customerSchema.partial().parse(request.body);
  const customer = await messService.updateCustomer(firstParam(request.params.id), input);

  if (!customer) {
    response.status(404).json({ message: 'Customer not found' });
    return;
  }

  response.json(customer);
}));

routes.delete('/customers/:id', asyncHandler(async (request: Request, response: Response) => {
  const deleted = await messService.deleteCustomer(firstParam(request.params.id));
  if (!deleted) {
    response.status(404).json({ message: 'Customer not found' });
    return;
  }

  response.status(204).send();
}));

routes.get('/payments', asyncHandler(async (_request: Request, response: Response) => {
  response.json(await messService.listPayments());
}));

routes.get('/payments/defaulters', asyncHandler(async (request: Request, response: Response) => {
  const month = typeof request.query.month === 'string' ? request.query.month : undefined;
  response.json(await messService.listDefaulters(month));
}));

routes.post('/payments/monthly-reset', asyncHandler(async (request: Request, response: Response) => {
  const month = typeof request.body?.month === 'string' ? request.body.month : undefined;
  response.json(await messService.getMonthlyResetSummary(month));
}));

routes.post('/payments', asyncHandler(async (request: Request, response: Response) => {
  const input = paymentSchema.parse(request.body);
  response.status(201).json(await messService.recordPayment(input));
}));

routes.patch('/payments/:id', asyncHandler(async (request: Request, response: Response) => {
  const input = paymentSchema.partial().parse(request.body);
  const payment = await messService.updatePayment(firstParam(request.params.id), input);

  if (!payment) {
    response.status(404).json({ message: 'Payment not found' });
    return;
  }

  response.json(payment);
}));

routes.delete('/payments/:id', asyncHandler(async (request: Request, response: Response) => {
  const deleted = await messService.deletePayment(firstParam(request.params.id));
  if (!deleted) {
    response.status(404).json({ message: 'Payment not found' });
    return;
  }

  response.status(204).send();
}));

routes.get('/attendance', asyncHandler(async (request: Request, response: Response) => {
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  const slot = typeof request.query.slot === 'string' ? request.query.slot : undefined;
  response.json(await messService.listAttendanceByDate(date, slot as 'lunch' | 'dinner' | undefined));
}));

routes.post('/attendance', asyncHandler(async (request: Request, response: Response) => {
  const input = attendanceSchema.parse(request.body);
  response.status(201).json(await messService.markAttendance(input));
}));

routes.get('/walk-ins', asyncHandler(async (request: Request, response: Response) => {
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  response.json(await messService.listWalkInsByDate(date));
}));

routes.post('/walk-ins', asyncHandler(async (request: Request, response: Response) => {
  const input = walkInSchema.parse(request.body);
  response.status(201).json(await messService.logWalkIn(input));
}));

routes.patch('/walk-ins/:id', asyncHandler(async (request: Request, response: Response) => {
  const input = walkInSchema.partial().parse(request.body);
  const walkIn = await messService.updateWalkIn(firstParam(request.params.id), input);

  if (!walkIn) {
    response.status(404).json({ message: 'Walk-in not found' });
    return;
  }

  response.json(walkIn);
}));

routes.delete('/walk-ins/:id', asyncHandler(async (request: Request, response: Response) => {
  const deleted = await messService.deleteWalkIn(firstParam(request.params.id));
  if (!deleted) {
    response.status(404).json({ message: 'Walk-in not found' });
    return;
  }

  response.status(204).send();
}));

routes.post('/ai/query', asyncHandler(async (request: Request, response: Response) => {
  const input = aiSchema.parse(request.body);
  response.json(await aiService.answer(input.query));
}));

routes.get('/reports/daily', asyncHandler(async (request: Request, response: Response) => {
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  response.json(await reportService.getDailyReport(date));
}));

routes.get('/reports/meals', asyncHandler(async (request: Request, response: Response) => {
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  response.json(await reportService.getMealSummary(date));
}));

routes.get('/reports/earnings', asyncHandler(async (request: Request, response: Response) => {
  const date = typeof request.query.date === 'string' ? request.query.date : undefined;
  response.json(await reportService.getEarnings(date));
}));
