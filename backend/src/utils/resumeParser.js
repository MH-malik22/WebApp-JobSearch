// pdf-parse and mammoth are large native-binding-laden deps. We lazy-import
// them only when actually needed so unit tests over `structureResume()` can
// run without installing them.

const SECTION_PATTERNS = [
  ['summary', /^(professional\s+)?summary|profile|objective\b/i],
  ['experience', /^(work\s+|professional\s+)?experience|employment\s+history\b/i],
  ['skills', /^(technical\s+|core\s+)?skills|competencies|technologies\b/i],
  ['education', /^education|academic\b/i],
  ['projects', /^projects|portfolio\b/i],
  ['certifications', /^certifications?|licenses?\b/i],
];

const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s)]+/gi;

export async function extractText(buffer, mimetype, filename = '') {
  const lower = (mimetype || '').toLowerCase();
  if (lower.includes('pdf') || filename.endsWith('.pdf')) {
    const { default: pdfParse } = await import('pdf-parse');
    const out = await pdfParse(buffer);
    return out.text;
  }
  if (
    lower.includes('officedocument.wordprocessingml') ||
    lower.includes('msword') ||
    filename.endsWith('.docx')
  ) {
    const { default: mammoth } = await import('mammoth');
    const out = await mammoth.extractRawText({ buffer });
    return out.value;
  }
  return buffer.toString('utf8');
}

function detectSection(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 80) return null;
  for (const [name, re] of SECTION_PATTERNS) {
    if (re.test(trimmed)) return name;
  }
  return null;
}

function parseContact(headerLines) {
  const text = headerLines.join('\n');
  const email = (text.match(EMAIL_RE) || [])[0] || null;
  const phone = (text.match(PHONE_RE) || [])[0] || null;
  const links = text.match(URL_RE) || [];
  // Name = first non-empty line that doesn't look like a contact field.
  const name =
    headerLines.find(
      (l) =>
        l.trim() &&
        !EMAIL_RE.test(l) &&
        !PHONE_RE.test(l) &&
        !URL_RE.test(l) &&
        l.trim().length < 60
    )?.trim() ?? null;
  return { name, email, phone, location: null, links };
}

function splitBullets(block) {
  return block
    .split(/\n+/)
    .map((l) => l.replace(/^[\s•·▪▫\-*●]+/, '').trim())
    .filter(Boolean);
}

// Best-effort: split each experience block into header (company/title/dates) + bullets.
function parseExperience(block) {
  const lines = block.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const header = lines[0];
  const dateIdx = lines.findIndex((l) =>
    /\b(19|20)\d{2}\b|\bpresent\b/i.test(l)
  );
  const dates = dateIdx >= 0 ? lines[dateIdx] : '';
  const bulletStart = Math.max(1, dateIdx >= 0 ? dateIdx + 1 : 1);
  const bullets = splitBullets(lines.slice(bulletStart).join('\n'));
  return { header, dates, bullets };
}

export function structureResume(rawText) {
  const lines = rawText.split(/\r?\n/);

  // Walk lines, split into sections.
  const sections = { _header: [] };
  let current = '_header';
  for (const line of lines) {
    const sec = detectSection(line);
    if (sec) {
      current = sec;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }

  const contact = parseContact(sections._header || []);

  const summaryText = (sections.summary || []).join('\n').trim();
  const skillsText = (sections.skills || []).join('\n').trim();
  const skills = skillsText
    ? skillsText
        .split(/[,•·\n]/)
        .map((s) => s.trim())
        .filter((s) => s && s.length < 60)
    : [];

  // Experience: split on blank lines between roles.
  const experienceBlocks = (sections.experience || [])
    .join('\n')
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map(parseExperience)
    .filter(Boolean);

  const educationLines = (sections.education || [])
    .map((l) => l.trim())
    .filter(Boolean);
  const projectLines = (sections.projects || [])
    .map((l) => l.trim())
    .filter(Boolean);
  const certLines = (sections.certifications || [])
    .map((l) => l.trim())
    .filter(Boolean);

  return {
    contact,
    summary: summaryText,
    skills,
    experience: experienceBlocks,
    education: educationLines,
    projects: projectLines,
    certifications: certLines,
    raw_text: rawText,
  };
}

export async function parseResume(buffer, mimetype, filename) {
  const text = await extractText(buffer, mimetype, filename);
  return structureResume(text);
}
