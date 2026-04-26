import { verifyToken } from '../services/authService.js';

function readToken(req) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const claims = verifyToken(token);
    req.user = { id: claims.sub, email: claims.email };
    next();
  } catch {
    res.status(401).json({ error: 'invalid_token' });
  }
}

export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const claims = verifyToken(token);
    req.user = { id: claims.sub, email: claims.email };
  } catch {
    /* ignore — leave req.user undefined */
  }
  next();
}
