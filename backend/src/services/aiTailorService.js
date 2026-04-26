import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env.js';

let _client;
function client() {
  if (!_client) {
    if (!env.anthropicApiKey) {
      const err = new Error(
        'ANTHROPIC_API_KEY is not set; cannot run AI tailoring'
      );
      err.status = 503;
      err.code = 'ai_unavailable';
      throw err;
    }
    _client = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return _client;
}

// Stable system prompt — cache it. Per the skill, prompt caching is a prefix
// match: keep this string byte-stable across requests so cache_read kicks in.
const TAILOR_SYSTEM = `You are an expert resume writer and ATS optimization specialist for technical roles (Cloud Infrastructure, DevOps, SRE, Platform Engineering).

Your job: take a candidate's base resume and a target job description, then produce a tailored version of the resume that maximizes ATS match and recruiter appeal — without fabricating any experience.

Rules:
1. NEVER invent employers, dates, titles, degrees, certifications, or technologies the candidate has not used. Reframing real work is allowed; inventing new work is not.
2. Rewrite the professional summary to mirror the job description's language and seniority level.
3. Reorder and rephrase experience bullet points to emphasize the most relevant work first; quantify achievements where the original implies a metric.
4. Surface matching technical skills prominently in the skills section.
5. Weave job-description keywords in naturally — no keyword stuffing, no comma-spam lists of every buzzword.
6. Keep the structure: contact, summary, skills, experience, education, projects, certifications.
7. Preserve all original employment dates, company names, and degree information verbatim.

Output format: a single JSON object with this shape:

{
  "summary": "string",
  "skills": ["string", ...],
  "experience": [
    { "header": "string", "dates": "string", "bullets": ["string", ...] }
  ],
  "education": ["string", ...],
  "projects": ["string", ...],
  "certifications": ["string", ...],
  "highlights": ["short note about what changed and why", ...]
}`;

const TAILORED_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          header: { type: 'string' },
          dates: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
        },
        required: ['header', 'bullets'],
        additionalProperties: false,
      },
    },
    education: { type: 'array', items: { type: 'string' } },
    projects: { type: 'array', items: { type: 'string' } },
    certifications: { type: 'array', items: { type: 'string' } },
    highlights: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'skills', 'experience'],
  additionalProperties: false,
};

function buildUserMessage({ resume, jobDescription, companyName, jobTitle }) {
  return `<job_description>
Target role: ${jobTitle || '(unspecified)'}${
    companyName ? ` at ${companyName}` : ''
  }

${jobDescription}
</job_description>

<base_resume_json>
${JSON.stringify(resume, null, 2)}
</base_resume_json>

Tailor the resume above to the job description. Return ONLY the JSON object specified in the system prompt — no preamble, no commentary, no markdown fences.`;
}

function extractJson(message) {
  // Prefer the structured `parsed_output` if the SDK populated it.
  if (message?.parsed_output) return message.parsed_output;

  for (const block of message?.content ?? []) {
    if (block.type === 'text') {
      const text = block.text || '';
      try {
        return JSON.parse(text);
      } catch {
        const match = text.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
      }
    }
  }
  throw new Error('Claude did not return parseable JSON');
}

export async function tailorResume({
  resume,
  jobDescription,
  companyName,
  jobTitle,
}) {
  const stream = client().messages.stream({
    model: env.anthropicModel,
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: TAILOR_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: buildUserMessage({
          resume,
          jobDescription,
          companyName,
          jobTitle,
        }),
      },
    ],
    output_config: {
      format: { type: 'json_schema', schema: TAILORED_SCHEMA },
    },
  });

  const finalMessage = await stream.finalMessage();
  const tailored = extractJson(finalMessage);

  return {
    tailored,
    usage: finalMessage.usage,
    model: finalMessage.model,
  };
}

const COVER_SYSTEM = `You are an expert technical recruiter and copywriter. Generate a concise, specific cover letter (3 short paragraphs, ~250-300 words) that:

1. Opens with the role and a hook tied to the company or product.
2. Highlights 2-3 concrete achievements from the resume that match the job description.
3. Closes with enthusiasm and a clear call to action.

Avoid clichés ("I am writing to..."), buzzword soup, and any details not supported by the resume. Tone: confident, warm, professional.`;

export async function generateCoverLetter({
  resume,
  jobDescription,
  companyName,
  jobTitle,
}) {
  const stream = client().messages.stream({
    model: env.anthropicModel,
    max_tokens: 1200,
    thinking: { type: 'adaptive' },
    system: [
      {
        type: 'text',
        text: COVER_SYSTEM,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `<job_description>
${jobTitle || 'Target role'}${companyName ? ` at ${companyName}` : ''}

${jobDescription}
</job_description>

<resume_json>
${JSON.stringify(resume, null, 2)}
</resume_json>

Write the cover letter now. Output the letter text only — no headers, no salutation placeholders like "[Hiring Manager]"; use a generic warm opener instead.`,
      },
    ],
  });

  const finalMessage = await stream.finalMessage();
  const text =
    finalMessage.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
  return { text, usage: finalMessage.usage, model: finalMessage.model };
}
