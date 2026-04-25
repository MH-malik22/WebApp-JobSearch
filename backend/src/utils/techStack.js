// Detect cloud / DevOps tech keywords inside a free-text job description.
// Keys are the canonical tag, values are case-insensitive match patterns.
const STACK = {
  AWS: [/\baws\b/i, /amazon web services/i],
  Azure: [/\bazure\b/i, /microsoft azure/i],
  GCP: [/\bgcp\b/i, /google cloud/i],
  Kubernetes: [/\bkubernetes\b/i, /\bk8s\b/i, /\beks\b/i, /\bgke\b/i, /\baks\b/i],
  Docker: [/\bdocker\b/i, /containerd/i],
  Terraform: [/\bterraform\b/i],
  Ansible: [/\bansible\b/i],
  Jenkins: [/\bjenkins\b/i],
  GitHubActions: [/github actions/i],
  GitLabCI: [/gitlab ci/i, /gitlab-ci/i],
  CircleCI: [/circleci/i, /circle ci/i],
  ArgoCD: [/argo\s?cd/i],
  Helm: [/\bhelm\b/i],
  Prometheus: [/prometheus/i],
  Grafana: [/grafana/i],
  Datadog: [/datadog/i],
  Linux: [/\blinux\b/i],
  Python: [/\bpython\b/i],
  Go: [/\bgolang\b/i, /\bgo\b(?=\s|,|\.|\/)/],
  Bash: [/\bbash\b/i, /shell scripting/i],
  CICD: [/ci\/cd/i, /\bcicd\b/i, /continuous integration/i, /continuous delivery/i],
  Pulumi: [/pulumi/i],
  Packer: [/\bpacker\b/i],
  Vault: [/hashicorp vault/i, /\bvault\b/i],
  Consul: [/\bconsul\b/i],
  Nomad: [/\bnomad\b/i],
  Istio: [/\bistio\b/i],
  ServiceMesh: [/service mesh/i, /linkerd/i],
  Postgres: [/postgres/i, /postgresql/i],
  Redis: [/\bredis\b/i],
  Kafka: [/\bkafka\b/i],
  Spark: [/\bspark\b/i],
  Lambda: [/\blambda\b/i],
  EKS: [/\beks\b/i],
  ECS: [/\becs\b/i],
  S3: [/\bs3\b/i],
  CloudFormation: [/cloudformation/i],
};

export function detectTechStack(text = '') {
  if (!text) return [];
  const found = new Set();
  for (const [tag, patterns] of Object.entries(STACK)) {
    if (patterns.some((re) => re.test(text))) found.add(tag);
  }
  return [...found];
}

export const TECH_STACK_TAGS = Object.keys(STACK);
