# Sample Code Snippets

## Defaulter Query
```ts
const paidCustomerIds = new Set(
  payments.filter((payment) => payment.month === month && payment.status === 'paid').map((payment) => payment.customerId),
);

const defaulters = customers.filter((customer) => customer.active && !paidCustomerIds.has(customer.id));
```

## Meal Count Summary
```ts
const vegMeals = dailyAttendanceRecords.filter((record) => customerPlan(record.customerId) === 'veg').length;
const nonVegMeals = dailyAttendanceRecords.filter((record) => customerPlan(record.customerId) === 'non-veg').length;
```

## Structured AI Answer
```ts
function answerQuery(query: string) {
  if (query.includes('Who has not paid')) {
    return `Defaulters this month: ${names.join(', ')}`;
  }
}
```

## Monthly Reset Summary
```ts
function getMonthlyResetSummary(month: string) {
  return {
    month,
    totalCustomers,
    paidCount,
    pendingCount,
    defaulters,
  };
}
```
