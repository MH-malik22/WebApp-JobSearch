export function notFound(req, res) {
  res.status(404).json({ error: 'not_found', path: req.path });
}

export function errorHandler(err, _req, res, _next) {
  console.error('[error]', err);
  const status = err.status ?? 500;
  res.status(status).json({
    error: err.code ?? 'internal_error',
    message: err.message ?? 'Something went wrong',
  });
}
