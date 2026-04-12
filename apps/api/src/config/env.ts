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

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
};
