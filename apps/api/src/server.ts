import { app } from './app.js';
import { prisma } from './infrastructure/prisma/prismaClient.js';
import { env } from './config/env.js';

const organizationId = 'org-demo';

async function bootstrap() {
  const isProduction = env.nodeEnv === 'production';
  const hasDatabase = Boolean(env.databaseUrl);

  if (isProduction && (!env.adminPassword || !env.authSecret)) {
    throw new Error('ADMIN_PASSWORD and AUTH_SECRET are required in production.');
  }

  if (!hasDatabase && (isProduction || !env.allowInMemoryFallback)) {
    const reason = isProduction
      ? 'DATABASE_URL is required in production.'
      : 'DATABASE_URL not set and ALLOW_IN_MEMORY_FALLBACK is disabled.';

    throw new Error(
      `${reason} Configure PostgreSQL to avoid data loss, or set ALLOW_IN_MEMORY_FALLBACK=true for temporary local testing only.`,
    );
  }

  if (hasDatabase) {
    await prisma.$connect();

    await prisma.organization.upsert({
      where: { id: organizationId },
      update: {},
      create: {
        id: organizationId,
        name: 'Demo Mess',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        monthlyMealPrice: 0,
      },
    });
  } else {
    console.warn('Starting API in temporary in-memory mode. Data will be lost on restart.');
  }

  app.listen(env.port, () => {
    console.log(`Mess API running on http://localhost:${env.port}`);
  });
}

void bootstrap().catch((error) => {
  console.error('Failed to bootstrap Mess API', error);
  process.exit(1);
});
