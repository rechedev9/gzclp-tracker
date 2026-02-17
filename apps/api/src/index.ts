import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { ApiError } from './middleware/error-handler';
import { authRoutes } from './routes/auth';
import { programRoutes } from './routes/programs';
import { catalogRoutes } from './routes/catalog';
import { resultRoutes } from './routes/results';

const CORS_ORIGIN = process.env['CORS_ORIGIN'] ?? 'http://localhost:3000';
const PORT = Number(process.env['PORT'] ?? 3001);

const app = new Elysia()
  .use(
    cors({
      origin: CORS_ORIGIN,
      credentials: true,
    })
  )
  .onError(({ code, error, set }) => {
    // Handle custom ApiError thrown in services/middleware
    if (error instanceof ApiError) {
      set.status = error.statusCode;
      return { error: error.message, code: error.code };
    }

    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Not found', code: 'NOT_FOUND' };
    }

    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'Validation failed', code: 'VALIDATION_ERROR' };
    }

    if (code === 'PARSE') {
      set.status = 400;
      return { error: 'Invalid request body', code: 'PARSE_ERROR' };
    }

    console.error(`[${code}]`, error);
    set.status = 500;
    return { error: 'Internal server error', code: 'INTERNAL_ERROR' };
  })
  .use(authRoutes)
  .use(programRoutes)
  .use(catalogRoutes)
  .use(resultRoutes)
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }))
  .listen(PORT, () => {
    console.error(`API running on http://localhost:${PORT}`);
  });

export type App = typeof app;
