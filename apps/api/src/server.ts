import { app } from './app.js';
import { prisma } from './infrastructure/prisma/prismaClient.js';
import { env } from './config/env.js';

const organizationId = 'org-demo';

async function bootstrap() {
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

  app.listen(env.port, () => {
    console.log(`Mess API running on http://localhost:${env.port}`);
  });
}

void bootstrap().catch((error) => {
  console.error('Failed to bootstrap Mess API', error);
  process.exit(1);
});
