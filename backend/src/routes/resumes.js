import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import {
  createResume,
  deleteResume,
  getResume,
  listResumes,
  updateResume,
} from '../services/resumeService.js';
import { parseResume } from '../utils/resumeParser.js';

const router = Router();
router.use(requireAuth);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.get('/', async (req, res, next) => {
  try {
    res.json({ resumes: await listResumes(req.user.id) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const resume = await getResume(req.user.id, req.params.id);
    if (!resume) return res.status(404).json({ error: 'not_found' });
    res.json({ resume });
  } catch (err) {
    next(err);
  }
});

const createBody = z.object({
  name: z.string().min(1).max(120),
  text: z.string().optional(),
  content: z.record(z.any()).optional(),
  isBase: z.boolean().optional(),
});

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const body = createBody.parse({
      ...req.body,
      isBase: req.body?.isBase === 'true' || req.body?.isBase === true,
      content: req.body?.content
        ? typeof req.body.content === 'string'
          ? JSON.parse(req.body.content)
          : req.body.content
        : undefined,
    });

    let content = body.content;
    if (req.file) {
      content = await parseResume(req.file.buffer, req.file.mimetype, req.file.originalname);
    } else if (body.text) {
      content = await parseResume(Buffer.from(body.text, 'utf8'), 'text/plain', 'paste.txt');
    }
    if (!content) return res.status(400).json({ error: 'no_content' });

    const resume = await createResume(req.user.id, {
      name: body.name,
      content,
      isBase: body.isBase ?? false,
    });
    res.status(201).json({ resume });
  } catch (err) {
    next(err);
  }
});

const updateBody = z.object({
  name: z.string().min(1).max(120).optional(),
  content: z.record(z.any()).optional(),
  isBase: z.boolean().optional(),
});

router.patch('/:id', async (req, res, next) => {
  try {
    const body = updateBody.parse(req.body);
    const resume = await updateResume(req.user.id, req.params.id, body);
    if (!resume) return res.status(404).json({ error: 'not_found' });
    res.json({ resume });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await deleteResume(req.user.id, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
