function parseCorsOrigins(rawOrigins?: string): string[] {
  const fallback = ['http://localhost:5173', 'http://127.0.0.1:5173'];
  if (!rawOrigins) {
    return fallback;
  }

  const origins = rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : fallback;
}

function parseBoolean(rawValue: string | undefined, defaultValue: boolean): boolean {
  if (rawValue == null) {
    return defaultValue;
  }

  const normalized = rawValue.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  databaseUrl: process.env.DATABASE_URL,
  allowInMemoryFallback: parseBoolean(process.env.ALLOW_IN_MEMORY_FALLBACK, false),
  adminUsername: process.env.ADMIN_USERNAME ?? 'admin',
  adminPassword: process.env.ADMIN_PASSWORD,
  authSecret: process.env.AUTH_SECRET ?? (process.env.NODE_ENV === 'production' ? undefined : 'local-dev-auth-secret-change-in-prod'),
  authTokenTtlHours: Number(process.env.AUTH_TOKEN_TTL_HOURS ?? 24),
};
