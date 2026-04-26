import client from 'prom-client';

export const registry = new client.Registry();
registry.setDefaultLabels({ service: 'cloudops-job-hunter' });
client.collectDefaultMetrics({ register: registry });

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Count of HTTP requests by method, route, and status',
  labelNames: ['method', 'route', 'status'],
  registers: [registry],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Histogram of HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
  registers: [registry],
});

export const scrapesTotal = new client.Counter({
  name: 'scrapes_total',
  help: 'Total scrape worker runs by source and outcome',
  labelNames: ['source', 'outcome'],
  registers: [registry],
});

export const jobsUpserted = new client.Counter({
  name: 'jobs_upserted_total',
  help: 'Jobs inserted or updated by source',
  labelNames: ['source', 'kind'],
  registers: [registry],
});

export const alertsSent = new client.Counter({
  name: 'alerts_emails_sent_total',
  help: 'Alert/digest emails sent by kind',
  labelNames: ['kind'],
  registers: [registry],
});

export const aiCallsTotal = new client.Counter({
  name: 'ai_calls_total',
  help: 'Anthropic API calls by endpoint and outcome',
  labelNames: ['endpoint', 'outcome'],
  registers: [registry],
});

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;
    // Use route pattern when available so /api/jobs/:id collapses to one label.
    const route = req.route?.path
      ? `${req.baseUrl ?? ''}${req.route.path}`
      : req.path;
    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
    };
    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, seconds);
  });
  next();
}
