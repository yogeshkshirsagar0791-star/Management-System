# System Architecture

## Text-Based Diagram

```
Operator / Mess Owner
        |
        v
React PWA Frontend
        |
        v
Node.js API (Express)
  |       |        |
  |       |        +--> AI Query Layer (Gemma 4 adapter or local prompt runner)
  |       +--> Reporting / Dashboard Services
  +--> Domain Services
        |
        v
PostgreSQL Database
  |
  +--> Customers
  +--> Payments
  +--> Attendance
  +--> Walk-ins
  +--> Organizations
  +--> Audit Logs
```

## Design Notes
- The frontend stays thin and mobile-first.
- The API contains the domain rules for payments, attendance, meal counts, and reporting.
- PostgreSQL is the system of record because the workflow is transactional and monthly reporting-heavy.
- AI is read-only and uses structured database context, not free-form business writes.
- The same tenant model can support multiple messes later without changing the core tables.
