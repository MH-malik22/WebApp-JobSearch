import { useEffect, useState } from 'react';
import {
  FileText,
  Upload,
  Loader2,
  Sparkles,
  Download,
  ClipboardCopy,
  FileDown,
  Mail,
  AlertTriangle,
} from 'lucide-react';
import {
  fetchResumes,
  fetchResume,
  uploadResume,
  pasteResume,
  fetchSavedJobs,
  scoreResume,
  tailorResume,
  generateCoverLetter,
} from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import ResumeDiff from '../components/ResumeDiff.jsx';
import {
  downloadDocx,
  downloadPdf,
  downloadText,
  copyText,
} from '../lib/exporters.js';

function ResumeManager({ resumes, onUpload, onSelect, selectedId, busy }) {
  const [name, setName] = useState('');
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [mode, setMode] = useState('file');

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onUpload({ name, file, text, isBase: resumes.length === 0 });
    setName('');
    setFile(null);
    setText('');
  };

  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">Your resumes</h3>
      {resumes.length > 0 ? (
        <ul className="mb-4 space-y-1">
          {resumes.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${
                  selectedId === r.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'hover:bg-slate-50'
                }`}
              >
                <span className="truncate">{r.name}</span>
                {r.is_base && <span className="badge-brand">base</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-slate-500">
          No resumes yet — upload one to get started.
        </p>
      )}

      <form onSubmit={submit} className="space-y-2 border-t border-slate-200 pt-3">
        <input
          type="text"
          required
          placeholder="Resume name (e.g. 'Base resume v3')"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input"
        />
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            className={`btn-ghost flex-1 ${mode === 'file' ? 'bg-slate-100' : ''}`}
            onClick={() => setMode('file')}
          >
            Upload PDF / DOCX
          </button>
          <button
            type="button"
            className={`btn-ghost flex-1 ${mode === 'text' ? 'bg-slate-100' : ''}`}
            onClick={() => setMode('text')}
          >
            Paste text
          </button>
        </div>
        {mode === 'file' ? (
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs"
          />
        ) : (
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your resume here…"
            className="input font-mono text-xs"
          />
        )}
        <button
          type="submit"
          disabled={busy || !name.trim() || (mode === 'file' ? !file : !text.trim())}
          className="btn-primary w-full"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Upload className="h-4 w-4" />
              <span className="ml-2">Add resume</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}

function JobInput({ savedJobs, mode, setMode, jobId, setJobId, jdText, setJdText, jobTitle, setJobTitle, companyName, setCompanyName }) {
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-semibold">Target job</h3>
      <div className="mb-3 flex gap-2 text-xs">
        <button
          type="button"
          className={`btn-ghost flex-1 ${mode === 'saved' ? 'bg-slate-100' : ''}`}
          onClick={() => setMode('saved')}
        >
          From saved jobs
        </button>
        <button
          type="button"
          className={`btn-ghost flex-1 ${mode === 'paste' ? 'bg-slate-100' : ''}`}
          onClick={() => setMode('paste')}
        >
          Paste JD
        </button>
      </div>

      {mode === 'saved' ? (
        savedJobs.length === 0 ? (
          <p className="text-xs text-slate-500">
            No saved jobs yet. Bookmark some on the Jobs tab, or paste a JD.
          </p>
        ) : (
          <select
            value={jobId ?? ''}
            onChange={(e) => setJobId(e.target.value || null)}
            className="input"
          >
            <option value="">Select a saved job…</option>
            {savedJobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {j.company}
              </option>
            ))}
          </select>
        )
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Job title"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="input text-sm"
            />
            <input
              type="text"
              placeholder="Company"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="input text-sm"
            />
          </div>
          <textarea
            rows={10}
            value={jdText}
            onChange={(e) => setJdText(e.target.value)}
            placeholder="Paste the job description here…"
            className="input text-xs"
          />
        </div>
      )}
    </div>
  );
}

function ScoreBadge({ score, missing = [] }) {
  const colour =
    score >= 75
      ? 'bg-emerald-100 text-emerald-700'
      : score >= 50
      ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700';
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">ATS match score</h3>
        <span className={`rounded-full px-3 py-1 text-lg font-semibold ${colour}`}>
          {score}%
        </span>
      </div>
      {missing.length > 0 && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-slate-700">
            Missing keywords from the JD:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missing.slice(0, 20).map((kw) => (
              <span key={kw} className="badge">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportBar({ resume }) {
  if (!resume) return null;
  return (
    <div className="card flex flex-wrap items-center gap-2 p-3 text-sm">
      <span className="text-xs font-semibold text-slate-600">Export:</span>
      <button onClick={() => downloadPdf(resume)} className="btn-ghost border border-slate-200">
        <FileDown className="h-4 w-4" />
        <span className="ml-1">PDF</span>
      </button>
      <button onClick={() => downloadDocx(resume)} className="btn-ghost border border-slate-200">
        <Download className="h-4 w-4" />
        <span className="ml-1">DOCX</span>
      </button>
      <button onClick={() => downloadText(resume)} className="btn-ghost border border-slate-200">
        <FileText className="h-4 w-4" />
        <span className="ml-1">TXT</span>
      </button>
      <button onClick={() => copyText(resume)} className="btn-ghost border border-slate-200">
        <ClipboardCopy className="h-4 w-4" />
        <span className="ml-1">Copy</span>
      </button>
    </div>
  );
}

export default function TailorPage() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);

  const [jobMode, setJobMode] = useState('saved');
  const [jobId, setJobId] = useState(null);
  const [jdText, setJdText] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');

  const [original, setOriginal] = useState(null);
  const [tailored, setTailored] = useState(null);
  const [score, setScore] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');

  const [uploading, setUploading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    fetchResumes().then(setResumes).catch(() => {});
    fetchSavedJobs().then(setSavedJobs).catch(() => setSavedJobs([]));
  }, [user]);

  useEffect(() => {
    if (!selectedResumeId) {
      setOriginal(null);
      return;
    }
    fetchResume(selectedResumeId)
      .then((r) => setOriginal(r.content_json))
      .catch(() => setOriginal(null));
  }, [selectedResumeId]);

  const onUpload = async ({ name, file, text, isBase }) => {
    setUploading(true);
    setError(null);
    try {
      const r = file
        ? await uploadResume({ name, file, isBase })
        : await pasteResume({ name, text, isBase });
      const list = await fetchResumes();
      setResumes(list);
      setSelectedResumeId(r.id);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setUploading(false);
    }
  };

  const buildPayload = () => {
    if (!selectedResumeId) return null;
    const base = { baseResumeId: selectedResumeId };
    if (jobMode === 'saved') {
      if (!jobId) return null;
      return { ...base, jobId };
    }
    if (!jdText.trim() || jdText.trim().length < 20) return null;
    return { ...base, jobDescription: jdText, jobTitle, companyName };
  };

  const onTailor = async () => {
    const payload = buildPayload();
    if (!payload) {
      setError('Pick a resume and either a saved job or pasted JD (20+ chars).');
      return;
    }
    setTailoring(true);
    setError(null);
    setCoverLetter('');
    try {
      const result = await tailorResume(payload);
      setOriginal(result.original);
      setTailored(result.tailored);
      setScore(result.score);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setTailoring(false);
    }
  };

  const onScoreOnly = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setError(null);
    try {
      const s = await scoreResume(payload);
      setScore(s);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  const onCoverLetter = async () => {
    const payload = buildPayload();
    if (!payload) return;
    setGenerating(true);
    setError(null);
    try {
      const { text } = await generateCoverLetter(payload);
      setCoverLetter(text);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setGenerating(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Sparkles className="mx-auto mb-3 h-10 w-10 text-brand-600" />
        <h1 className="text-2xl font-semibold">Tailor Resume</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to upload a resume and tailor it to a job description.
        </p>
      </div>
    );
  }

  // Merge original (for unspecified sections) with the AI-tailored content
  // for the export bar — preserves contact, education, certifications, etc.
  const mergedTailored = tailored && original
    ? { ...original, ...tailored }
    : tailored;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Tailor Resume</h1>
        <p className="text-sm text-slate-600">
          Upload your base resume, pick a job, and let Claude rewrite it to maximize ATS match and recruiter appeal.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <ResumeManager
            resumes={resumes}
            onUpload={onUpload}
            onSelect={setSelectedResumeId}
            selectedId={selectedResumeId}
            busy={uploading}
          />
          <JobInput
            savedJobs={savedJobs}
            mode={jobMode}
            setMode={setJobMode}
            jobId={jobId}
            setJobId={setJobId}
            jdText={jdText}
            setJdText={setJdText}
            jobTitle={jobTitle}
            setJobTitle={setJobTitle}
            companyName={companyName}
            setCompanyName={setCompanyName}
          />
          <div className="card flex flex-col gap-2 p-4">
            <button
              type="button"
              disabled={tailoring || !selectedResumeId}
              onClick={onTailor}
              className="btn-primary"
            >
              {tailoring ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span className="ml-2">Tailor with Claude</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={!selectedResumeId}
              onClick={onScoreOnly}
              className="btn-ghost border border-slate-200"
            >
              Score without tailoring
            </button>
            <button
              type="button"
              disabled={generating || !selectedResumeId}
              onClick={onCoverLetter}
              className="btn-ghost border border-slate-200"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  <span className="ml-2">Generate cover letter</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="card flex items-start gap-2 border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {score && <ScoreBadge score={score.score} missing={score.missing} />}

          {tailored ? (
            <>
              <ExportBar resume={mergedTailored} />
              <ResumeDiff original={original} tailored={tailored} />
            </>
          ) : original ? (
            <div className="card p-6 text-sm text-slate-500">
              <p className="mb-2 font-medium text-slate-700">
                Resume loaded. Pick a job and click "Tailor with Claude".
              </p>
              <p>
                You can also click "Score without tailoring" first to see your
                current keyword match.
              </p>
            </div>
          ) : (
            <div className="card p-6 text-sm text-slate-500">
              Upload or select a resume to get started.
            </div>
          )}

          {coverLetter && (
            <div className="card p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Cover letter</h3>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(coverLetter)}
                  className="btn-ghost border border-slate-200 text-xs"
                >
                  <ClipboardCopy className="h-3.5 w-3.5" />
                  <span className="ml-1">Copy</span>
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {coverLetter}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
