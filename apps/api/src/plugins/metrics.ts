import { Elysia } from 'elysia';
import { httpRequestDuration, httpRequestsTotal } from '../lib/metrics';

/**
 * Normalises URL paths to route patterns to prevent high-cardinality Prometheus
 * labels. UUIDs and numeric segments are replaced with placeholders.
 *
 * /programs/abc-123-...  → /programs/:id
 * /programs/:id/results/5/t1  → /programs/:id/results/:n/:s
 */
function normaliseRoute(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:n');
}

// WeakMap keyed by Request object so each request has an independent start time.
// Entries are automatically GC'd when the Request is no longer reachable.
const requestStartTimes = new WeakMap<Request, number>();

export const metricsPlugin = new Elysia({ name: 'metrics-plugin' })
  .onRequest(({ request }): void => {
    requestStartTimes.set(request, Date.now());
  })
  .onAfterHandle({ as: 'global' }, ({ request, set }): void => {
    const startMs = requestStartTimes.get(request);
    if (startMs === undefined) return;
    requestStartTimes.delete(request);

    const method = request.method;
    const route = normaliseRoute(new URL(request.url).pathname);
    const statusCode = String(typeof set.status === 'number' ? set.status : 200);
    const durationSec = (Date.now() - startMs) / 1000;

    httpRequestDuration.observe({ method, route, status_code: statusCode }, durationSec);
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
  });
