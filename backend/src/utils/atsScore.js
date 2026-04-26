// Lightweight ATS-style scoring: how many of the JD's "important" terms
// (proper nouns + tech keywords + multi-word phrases) appear in the resume.

const STOPWORDS = new Set([
  'the','and','for','with','you','your','our','are','was','were','will','have',
  'has','had','this','that','these','those','from','into','onto','their','they',
  'them','its','his','her','but','not','can','any','all','each','every','some',
  'such','than','then','also','more','most','very','just','about','using','use',
  'used','team','teams','work','working','years','year','plus','strong','etc',
  'including','include','included','etc','well','able','must','should','would',
  'could','make','made','making','look','looking','find','finds','need','needs',
  'a','an','of','in','on','at','to','as','is','be','by','or','if','it','we','i',
]);

function tokenize(text = '') {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s/-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function keywordSet(text = '') {
  const out = new Set();
  for (const tok of tokenize(text)) {
    if (tok.length < 3 || tok.length > 32) continue;
    if (STOPWORDS.has(tok)) continue;
    if (/^\d+$/.test(tok)) continue;
    out.add(tok);
  }
  return out;
}

function importantKeywords(text = '') {
  // Heuristic: tech-stack-shaped tokens, capitalized acronyms, hyphenated terms.
  const tokens = (text.match(/\b[A-Za-z][A-Za-z0-9+.#/-]{1,31}\b/g) || []);
  const set = new Set();
  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (STOPWORDS.has(lower)) continue;
    if (lower.length < 3) continue;
    if (
      /^[A-Z0-9]{2,}$/.test(tok) ||                 // ALLCAPS / acronyms
      /\d/.test(tok) ||                              // contains a digit (e.g. EC2, k8s)
      /[+#.\-/]/.test(tok) ||                        // tech-y punctuation
      /^[A-Z][a-z]+[A-Z]/.test(tok)                  // CamelCase
    ) {
      set.add(lower);
    }
  }
  return set;
}

export function atsScore(jobDescription, resumeText) {
  const jdImportant = importantKeywords(jobDescription || '');
  const jdGeneral = keywordSet(jobDescription || '');
  const resume = keywordSet(resumeText || '');

  if (jdImportant.size === 0 && jdGeneral.size === 0) {
    return { score: 0, matched: [], missing: [] };
  }

  const importantWeight = 2;
  const generalWeight = 1;

  let earned = 0;
  let total = 0;
  const matched = [];
  const missing = [];

  for (const kw of jdImportant) {
    total += importantWeight;
    if (resume.has(kw)) {
      earned += importantWeight;
      matched.push(kw);
    } else {
      missing.push(kw);
    }
  }
  for (const kw of jdGeneral) {
    if (jdImportant.has(kw)) continue;
    total += generalWeight;
    if (resume.has(kw)) earned += generalWeight;
  }

  const score = Math.min(100, Math.round((earned / Math.max(1, total)) * 100));
  return {
    score,
    matched: matched.slice(0, 60),
    missing: missing.slice(0, 30),
  };
}

export function resumeToText(resume = {}) {
  const parts = [];
  if (resume.summary) parts.push(resume.summary);
  if (Array.isArray(resume.skills)) parts.push(resume.skills.join(' '));
  if (Array.isArray(resume.experience)) {
    for (const exp of resume.experience) {
      if (exp?.header) parts.push(exp.header);
      if (Array.isArray(exp?.bullets)) parts.push(exp.bullets.join('\n'));
    }
  }
  if (Array.isArray(resume.projects)) parts.push(resume.projects.join('\n'));
  if (Array.isArray(resume.education)) parts.push(resume.education.join('\n'));
  if (Array.isArray(resume.certifications))
    parts.push(resume.certifications.join('\n'));
  return parts.join('\n');
}
