import { createHash } from 'node:crypto';

const norm = (s = '') => s.toLowerCase().trim().replace(/\s+/g, ' ');

export function dedupeHash({ title, company, location }) {
  const key = [norm(title), norm(company), norm(location ?? '')].join('|');
  return createHash('sha256').update(key).digest('hex');
}
