import { test } from 'node:test';
import assert from 'node:assert/strict';
import { atsScore, resumeToText } from '../src/utils/atsScore.js';

const JD = `
Senior Cloud Infrastructure Engineer

We are looking for an engineer with strong AWS, Kubernetes, and Terraform
experience. You will own multi-region EKS clusters, GitHub Actions pipelines,
and observability with Prometheus and Datadog. Bonus: ArgoCD, Pulumi, Go.
`;

test('atsScore: high score when resume mirrors JD keywords', () => {
  const resume = `
    Built EKS clusters on AWS with Terraform and Helm. Wrote GitHub Actions
    pipelines, instrumented services with Prometheus, Datadog, and ArgoCD.
    Comfortable in Go and Python. Multi-region experience. ArgoCD, Pulumi.
  `;
  const result = atsScore(JD, resume);
  assert.ok(result.score >= 30, `expected >=30 got ${result.score}`);
  assert.ok(result.matched.length >= 5);
  // High-keyword resume scores meaningfully better than empty resume.
  const baseline = atsScore(JD, '').score;
  assert.ok(result.score > baseline);
});

test('atsScore: low score when resume shares no keywords', () => {
  const resume = `Frontend developer specializing in CSS and Photoshop.`;
  const result = atsScore(JD, resume);
  assert.ok(result.score < 30, `expected <30 got ${result.score}`);
  assert.ok(result.missing.length >= 1);
});

test('atsScore: empty inputs return zero', () => {
  const r = atsScore('', '');
  assert.equal(r.score, 0);
  assert.deepEqual(r.matched, []);
  assert.deepEqual(r.missing, []);
});

test('atsScore: surfaces common ATS misses', () => {
  // Resume has the words, JD is tech-keyword-heavy — missing should still
  // contain real keywords, not stopwords.
  const result = atsScore(JD, 'I am an engineer.');
  assert.ok(result.missing.some((kw) => /aws|terraform|kubernetes|argocd/i.test(kw)));
  // No stopwords leak through.
  assert.ok(!result.missing.some((kw) => ['the', 'and', 'with'].includes(kw)));
});

test('atsScore: caps missing keyword list at 30', () => {
  const longJd = 'AWS Azure GCP Kubernetes Docker Terraform Ansible Jenkins '
    .repeat(20);
  const result = atsScore(longJd, '');
  assert.ok(result.missing.length <= 30);
});

test('resumeToText: serializes resume sections to a single string', () => {
  const text = resumeToText({
    summary: 'Senior platform engineer.',
    skills: ['AWS', 'Kubernetes'],
    experience: [{ header: 'Cloud Eng @ Acme', bullets: ['Built EKS clusters', 'Cut MTTR 40%'] }],
    education: ['BSc CS, MIT'],
    certifications: ['AWS Pro'],
  });
  assert.ok(text.includes('Senior platform engineer'));
  assert.ok(text.includes('AWS'));
  assert.ok(text.includes('Built EKS clusters'));
  assert.ok(text.includes('AWS Pro'));
});

test('resumeToText: handles empty / partial resumes', () => {
  assert.equal(resumeToText({}), '');
  const t = resumeToText({ summary: 'just a summary' });
  assert.equal(t, 'just a summary');
});
