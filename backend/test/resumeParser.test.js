import { test } from 'node:test';
import assert from 'node:assert/strict';
import { structureResume } from '../src/utils/resumeParser.js';

const SAMPLE = `Jane Doe
jane.doe@example.com · (415) 555-1212 · https://github.com/janedoe

Professional Summary
Senior Cloud Infrastructure Engineer with 8+ years of AWS and Kubernetes
experience. Built multi-region platforms serving millions of users.

Experience

Senior Cloud Engineer · Acme Corp
2021 — Present
• Designed multi-region EKS architecture serving 5M req/day
• Cut deploy time from 45min to 3min with Argo Rollouts
• Mentored team of 6 engineers

Platform Engineer · Globex
2018 — 2021
• Built Terraform modules adopted across 4 BUs
• Migrated 200+ services from EC2 to EKS

Skills
AWS, Kubernetes, Terraform, Go, Python, Argo CD, Prometheus, Datadog

Education
BSc Computer Science, MIT, 2014

Certifications
AWS Solutions Architect Professional
Certified Kubernetes Administrator
`;

test('resumeParser: extracts contact info from header', () => {
  const r = structureResume(SAMPLE);
  assert.equal(r.contact.email, 'jane.doe@example.com');
  assert.match(r.contact.phone, /415/);
  assert.ok(r.contact.links.some((l) => l.includes('github.com/janedoe')));
});

test('resumeParser: separates summary, skills, experience, education', () => {
  const r = structureResume(SAMPLE);
  assert.match(r.summary, /Senior Cloud Infrastructure Engineer/);
  assert.ok(r.skills.length > 0, `expected skills, got ${r.skills.length}`);
  assert.ok(r.skills.some((s) => /AWS/i.test(s)));
  assert.ok(r.experience.length >= 2);
  assert.ok(r.education.some((l) => /MIT/.test(l)));
  assert.ok(r.certifications.some((l) => /AWS Solutions/.test(l)));
});

test('resumeParser: experience entries split into header + bullets', () => {
  const r = structureResume(SAMPLE);
  const acme = r.experience[0];
  assert.match(acme.header, /Senior Cloud Engineer/);
  assert.ok(acme.bullets.length >= 3);
  assert.ok(acme.bullets.some((b) => b.includes('multi-region EKS')));
});

test('resumeParser: empty input does not throw', () => {
  const r = structureResume('');
  assert.equal(r.summary, '');
  assert.deepEqual(r.skills, []);
  assert.deepEqual(r.experience, []);
});

test('resumeParser: preserves raw_text', () => {
  const r = structureResume(SAMPLE);
  assert.equal(r.raw_text, SAMPLE);
});
