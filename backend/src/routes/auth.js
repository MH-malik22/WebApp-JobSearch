import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  authenticate,
  credentials,
  findUserById,
  registerUser,
  signToken,
} from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const data = credentials.parse(req.body);
    const user = await registerUser(data);
    const token = signToken(user);
    res.status(201).json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const data = credentials.parse(req.body);
    const user = await authenticate(data);
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'not_found' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
