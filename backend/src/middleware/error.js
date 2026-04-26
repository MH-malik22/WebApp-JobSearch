import { logger } from '../config/logger.js';

export function notFound(req, res) {
  res.status(404).json({ error: 'not_found', path: req.path, requestId: req.id });
}

export function errorHandler(err, req, res, _next) {
  if (err?.name === 'ZodError') {
    return res.status(400).json({
      error: 'validation_error',
      issues: err.issues,
      requestId: req.id,
    });
  }
  const status = err.status ?? 500;
  // Log 5xx as error, 4xx as warn — keeps signal:noise in dashboards.
  const log = status >= 500 ? logger.error.bind(logger) : logger.warn.bind(logger);
  log(
    {
      err: { message: err.message, stack: err.stack, code: err.code },
      requestId: req.id,
      path: req.path,
      method: req.method,
    },
    'request_error'
  );
  res.status(status).json({
    error: err.code ?? 'internal_error',
    message: err.message ?? 'Something went wrong',
    requestId: req.id,
  });
}
