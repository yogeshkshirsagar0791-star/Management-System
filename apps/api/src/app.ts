import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import { env } from './config/env.js';
import { routes } from './http/routes.js';

export const app = express();

app.use(cors({
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    if (env.nodeEnv !== 'production') {
      try {
        const url = new URL(origin);
        if ((url.hostname === 'localhost' || url.hostname === '127.0.0.1') && url.protocol === 'http:') {
          callback(null, true);
          return;
        }
      } catch {
        // Keep the explicit allowlist for malformed origins.
      }
    }

    callback(new Error(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use('/api', routes);

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  if (error instanceof Error && 'name' in error && error.name === 'ZodError') {
    response.status(400).json({ message: 'Validation failed' });
    return;
  }

  if (error instanceof Error) {
    response.status(500).json({ message: error.message });
    return;
  }

  response.status(500).json({ message: 'Unexpected server error' });
});
