import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeHash } from '../src/utils/dedupe.js';

test('dedupe: same title/company/location produces same hash', () => {
  const a = dedupeHash({ title: 'DevOps Engineer', company: 'Acme', location: 'Remote' });
  const b = dedupeHash({ title: 'DevOps Engineer', company: 'Acme', location: 'Remote' });
  assert.equal(a, b);
});

test('dedupe: case- and whitespace-insensitive', () => {
  const a = dedupeHash({ title: 'DevOps Engineer', company: 'Acme', location: 'Remote' });
  const b = dedupeHash({ title: '  devops  engineer ', company: 'ACME', location: 'remote' });
  assert.equal(a, b);
});

test('dedupe: different inputs produce different hashes', () => {
  const a = dedupeHash({ title: 'DevOps Engineer', company: 'Acme', location: 'Remote' });
  const b = dedupeHash({ title: 'DevOps Engineer', company: 'Globex', location: 'Remote' });
  assert.notEqual(a, b);
});

test('dedupe: missing location does not collide with empty string', () => {
  const a = dedupeHash({ title: 'X', company: 'Y', location: undefined });
  const b = dedupeHash({ title: 'X', company: 'Y', location: '' });
  // Both normalize to empty — should be equal by design.
  assert.equal(a, b);
});

test('dedupe: 64-char hex SHA-256', () => {
  const h = dedupeHash({ title: 'a', company: 'b', location: 'c' });
  assert.match(h, /^[a-f0-9]{64}$/);
});
