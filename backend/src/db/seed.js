import { upsertJobs } from '../services/jobsService.js';
import { detectTechStack } from '../utils/techStack.js';
import { dedupeHash } from '../utils/dedupe.js';
import { pool } from './pool.js';

const now = Date.now();
const hoursAgo = (h) => new Date(now - h * 3600 * 1000);

const samples = [
  {
    title: 'Senior Cloud Infrastructure Engineer',
    company: 'Northwind Cloud',
    company_logo: 'https://logo.clearbit.com/northwind.com',
    location: 'Remote, US',
    is_remote: true,
    posted_at: hoursAgo(3),
    salary_min: 160000,
    salary_max: 210000,
    salary_currency: 'USD',
    description:
      'Build and operate multi-region AWS infrastructure with Terraform, EKS, and ArgoCD. ' +
      'Improve CI/CD pipelines (GitHub Actions), observability (Prometheus, Grafana, Datadog), ' +
      'and reliability for a growing platform serving millions of requests/day.',
    apply_url: 'https://example.com/jobs/northwind-cloud-eng',
    experience: '5+ yrs',
  },
  {
    title: 'DevOps Engineer (Kubernetes / GCP)',
    company: 'Acme Robotics',
    company_logo: 'https://logo.clearbit.com/acme.com',
    location: 'Austin, TX',
    is_remote: false,
    posted_at: hoursAgo(11),
    salary_min: 140000,
    salary_max: 175000,
    salary_currency: 'USD',
    description:
      'Own GKE clusters, Helm charts, and Argo Rollouts. Build internal developer platform ' +
      'with Terraform, Pulumi, and Backstage. Strong Linux + Bash + Python required.',
    apply_url: 'https://example.com/jobs/acme-devops',
    experience: '3+ yrs',
  },
  {
    title: 'Site Reliability Engineer',
    company: 'Globex Fintech',
    company_logo: 'https://logo.clearbit.com/globex.com',
    location: 'Remote, US/Canada',
    is_remote: true,
    posted_at: hoursAgo(20),
    salary_min: 170000,
    salary_max: 220000,
    salary_currency: 'USD',
    description:
      'Reduce MTTR across our Azure/AKS estate. Drive SLOs with Prometheus + Grafana, ' +
      'incident response, and chaos engineering. Go and Python tooling.',
    apply_url: 'https://example.com/jobs/globex-sre',
    experience: 'Senior',
  },
  {
    title: 'Platform Engineer',
    company: 'Initech Data',
    company_logo: 'https://logo.clearbit.com/initech.com',
    location: 'New York, NY',
    is_remote: false,
    posted_at: hoursAgo(30),
    salary_min: 150000,
    salary_max: 190000,
    salary_currency: 'USD',
    description:
      'Design golden paths on AWS EKS with Terraform, Crossplane, and ArgoCD. Work closely ' +
      'with Kafka, Spark, and Postgres teams to ship a self-serve data platform.',
    apply_url: 'https://example.com/jobs/initech-platform',
    experience: '4+ yrs',
  },
  {
    title: 'Junior Cloud Engineer (AWS)',
    company: 'Hooli Cloud',
    company_logo: 'https://logo.clearbit.com/hooli.com',
    location: 'Remote, US',
    is_remote: true,
    posted_at: hoursAgo(40),
    salary_min: 95000,
    salary_max: 120000,
    salary_currency: 'USD',
    description:
      'Help maintain AWS Lambda + ECS workloads. Write CloudFormation/Terraform, automate ' +
      'with Python and Bash, on-call rotation with Datadog.',
    apply_url: 'https://example.com/jobs/hooli-jr-cloud',
    experience: 'Junior',
  },
  {
    title: 'Staff Infrastructure Engineer',
    company: 'Stark Systems',
    company_logo: 'https://logo.clearbit.com/stark.com',
    location: 'Remote, Global',
    is_remote: true,
    posted_at: hoursAgo(46),
    salary_min: 220000,
    salary_max: 280000,
    salary_currency: 'USD',
    description:
      'Lead multi-cloud (AWS + GCP) strategy. Service mesh (Istio), HashiCorp Vault, ' +
      'Consul, Nomad. Mentor SRE org and define platform north-star.',
    apply_url: 'https://example.com/jobs/stark-staff-infra',
    experience: 'Staff',
  },
];

const enriched = samples.map((s) => ({
  source: 'seed',
  source_id: `seed-${s.company}-${s.title}`.replace(/\s+/g, '-').toLowerCase(),
  dedupe_hash: dedupeHash({ title: s.title, company: s.company, location: s.location }),
  tech_stack_tags: detectTechStack(`${s.title}\n${s.description}`),
  raw: null,
  ...s,
}));

(async () => {
  const result = await upsertJobs(enriched);
  console.log('[seed] done:', result);
  await pool.end();
})().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
