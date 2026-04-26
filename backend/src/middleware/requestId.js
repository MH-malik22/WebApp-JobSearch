import { randomUUID } from 'node:crypto';

export function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const id = typeof incoming === 'string' && incoming.length <= 80 ? incoming : randomUUID();
  req.id = id;
  res.setHeader('x-request-id', id);
  next();
}
