# Database Schema

## Tables

### organizations
- id
- name
- timezone
- currency
- monthly_meal_price
- created_at
- updated_at

### customers
- id
- organization_id
- name
- phone
- plan_type (`veg` or `non-veg`)
- active
- monthly_subscription
- created_at
- updated_at

### payments
- id
- organization_id
- customer_id
- month (`YYYY-MM`)
- amount
- status (`paid` or `pending`)
- method (`cash`, `upi`, `bank`)
- recorded_at

### attendance
- id
- organization_id
- customer_id
- date (`YYYY-MM-DD`)
- slot (`breakfast`, `lunch`, `dinner`)
- present

### walk_ins
- id
- organization_id
- date
- slot
- customer_count
- plan_type
- amount
- payment_mode
- created_at

### audit_logs
- id
- organization_id
- actor_id
- entity_type
- entity_id
- action
- metadata
- created_at

## Reporting Rules
- Defaulters are customers with no paid payment row for the active month.
- Monthly reset is a closing process, not a destructive delete.
- Meal count is derived from attendance plus walk-in records.
- Revenue is derived from monthly payments plus walk-in earnings.
