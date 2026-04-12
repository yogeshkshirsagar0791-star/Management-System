# Implementation Plan

## Phase 1: Foundation
- Scaffold the monorepo.
- Define shared domain contracts.
- Create the initial React and Node.js apps.

## Phase 2: Core Operations
- Implement customer CRUD.
- Implement payment tracking and defaulters.
- Implement attendance and walk-in logging.
- Implement dashboard summaries.

## Phase 3: Reporting
- Add daily and monthly reports.
- Add meal count and earnings summaries.
- Add exports and filters.

## Phase 4: AI Integration
- Build structured prompt generation.
- Add a Gemma 4 adapter or local model bridge.
- Keep all AI answers read-only.

## Phase 5: Notifications
- Add WhatsApp reminders for payments.
- Add attendance update notifications.
- Queue outbound messages asynchronously.

## Phase 6: SaaS Readiness
- Add organization onboarding.
- Add roles and permissions.
- Add audit logs and tenant isolation.
- Add subscription/billing hooks.
