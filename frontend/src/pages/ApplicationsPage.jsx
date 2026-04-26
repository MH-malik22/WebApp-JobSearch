import { useEffect, useState } from 'react';
import clsx from 'clsx';
import {
  Briefcase,
  Trash2,
  Plus,
  Loader2,
  ExternalLink,
  TrendingUp,
} from 'lucide-react';
import {
  createApplication,
  deleteApplication,
  fetchApplications,
  fetchApplicationStats,
  fetchSavedJobs,
  fetchSavedTailored,
  updateApplication,
} from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';
import { timeAgo } from '../lib/format.js';

const STATUSES = [
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'ghosted',
  'withdrawn',
];

const STATUS_COLORS = {
  applied: 'bg-blue-100 text-blue-700',
  screening: 'bg-cyan-100 text-cyan-700',
  interview: 'bg-amber-100 text-amber-700',
  offer: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  ghosted: 'bg-slate-200 text-slate-600',
  withdrawn: 'bg-slate-100 text-slate-500',
};

function StatsTable({ stats }) {
  if (!stats || stats.length === 0) return null;
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2">
        <TrendingUp className="h-4 w-4 text-slate-500" />
        <h3 className="text-sm font-semibold">Resume A/B performance</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-2 text-left">Resume variant</th>
            <th className="px-3 py-2 text-right">Apps</th>
            <th className="px-3 py-2 text-right">Interviews</th>
            <th className="px-3 py-2 text-right">Offers</th>
            <th className="px-3 py-2 text-right">Response rate</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s) => (
            <tr key={s.tailored_resume_id} className="border-t border-slate-100">
              <td className="px-4 py-2 font-medium">{s.label}</td>
              <td className="px-3 py-2 text-right">{s.total}</td>
              <td className="px-3 py-2 text-right">{s.interviews}</td>
              <td className="px-3 py-2 text-right">{s.offers}</td>
              <td className="px-3 py-2 text-right">
                <span
                  className={clsx(
                    'rounded px-2 py-0.5 text-xs font-medium',
                    s.response_rate >= 30
                      ? 'bg-emerald-100 text-emerald-700'
                      : s.response_rate >= 10
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-100 text-slate-500'
                  )}
                >
                  {s.response_rate}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NewApplicationForm({ savedJobs, tailored, onCreate, busy }) {
  const [draft, setDraft] = useState({
    jobId: '',
    tailoredResumeId: '',
    company: '',
    title: '',
    applyUrl: '',
    notes: '',
  });

  const submit = async (e) => {
    e.preventDefault();
    const payload = {
      jobId: draft.jobId || null,
      tailoredResumeId: draft.tailoredResumeId || null,
      company: draft.company || null,
      title: draft.title || null,
      applyUrl: draft.applyUrl || null,
      notes: draft.notes || null,
    };
    if (!payload.jobId && !payload.title && !payload.company) return;
    await onCreate(payload);
    setDraft({
      jobId: '',
      tailoredResumeId: '',
      company: '',
      title: '',
      applyUrl: '',
      notes: '',
    });
  };

  return (
    <form className="card space-y-3 p-4" onSubmit={submit}>
      <h3 className="text-sm font-semibold">Log a new application</h3>
      <select
        className="input text-sm"
        value={draft.jobId}
        onChange={(e) => {
          const job = savedJobs.find((j) => j.id === e.target.value);
          setDraft((d) => ({
            ...d,
            jobId: e.target.value,
            company: job?.company || d.company,
            title: job?.title || d.title,
            applyUrl: job?.apply_url || d.applyUrl,
          }));
        }}
      >
        <option value="">— Custom job (no saved match) —</option>
        {savedJobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title} — {j.company}
          </option>
        ))}
      </select>

      {!draft.jobId && (
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            placeholder="Company"
            value={draft.company}
            onChange={(e) => setDraft({ ...draft, company: e.target.value })}
            className="input text-sm"
          />
          <input
            type="text"
            placeholder="Title"
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="input text-sm"
          />
          <input
            type="url"
            placeholder="Apply URL"
            value={draft.applyUrl}
            onChange={(e) => setDraft({ ...draft, applyUrl: e.target.value })}
            className="input col-span-2 text-sm"
          />
        </div>
      )}

      <select
        className="input text-sm"
        value={draft.tailoredResumeId}
        onChange={(e) => setDraft({ ...draft, tailoredResumeId: e.target.value })}
      >
        <option value="">No tailored resume</option>
        {tailored.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label || `Tailored ${t.id.slice(0, 8)}`}
            {t.match_score ? ` — ${t.match_score}%` : ''}
          </option>
        ))}
      </select>

      <textarea
        rows={2}
        placeholder="Notes (optional)"
        value={draft.notes}
        onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        className="input text-sm"
      />

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4" />
            <span className="ml-1">Log application</span>
          </>
        )}
      </button>
    </form>
  );
}

function ApplicationRow({ app, onChangeStatus, onDelete }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2">
        <div className="font-medium">{app.title || app.job_title || '—'}</div>
        <div className="text-xs text-slate-500">{app.company || app.job_company || ''}</div>
      </td>
      <td className="px-3 py-2 text-xs text-slate-600">{app.tailored_label || '—'}</td>
      <td className="px-3 py-2 text-xs text-slate-500">
        {timeAgo(app.applied_at)}
      </td>
      <td className="px-3 py-2">
        <select
          value={app.status}
          onChange={(e) => onChangeStatus(app.id, e.target.value)}
          className={clsx(
            'rounded-md px-2 py-1 text-xs ring-1 ring-inset ring-slate-200',
            STATUS_COLORS[app.status]
          )}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-2 text-right">
        <div className="inline-flex items-center gap-1">
          {app.apply_url && (
            <a
              href={app.apply_url}
              target="_blank"
              rel="noreferrer noopener"
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          <button
            type="button"
            onClick={() => onDelete(app.id)}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [stats, setStats] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [tailored, setTailored] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);

  const loadAll = () =>
    Promise.all([
      fetchApplications(),
      fetchApplicationStats(),
      fetchSavedJobs().catch(() => []),
      fetchSavedTailored().catch(() => []),
    ]).then(([a, s, sj, t]) => {
      setApps(a);
      setStats(s);
      setSavedJobs(sj);
      setTailored(t);
    });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadAll()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const onCreate = async (payload) => {
    setCreating(true);
    setError(null);
    try {
      await createApplication(payload);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setCreating(false);
    }
  };

  const onChangeStatus = async (id, status) => {
    const updated = await updateApplication(id, { status });
    setApps((cur) => cur.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    fetchApplicationStats().then(setStats).catch(() => {});
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this application record?')) return;
    await deleteApplication(id);
    await loadAll();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Briefcase className="mx-auto mb-3 h-10 w-10 text-brand-600" />
        <h1 className="text-2xl font-semibold">Applications tracker</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to track your applications and A/B test resume variants.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Applications</h1>
        <p className="text-sm text-slate-600">
          Track which tailored resume you sent, where, and how it landed —
          stats below show response rates per resume variant.
        </p>
      </div>

      {error && (
        <div className="card mb-4 border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
        <NewApplicationForm
          savedJobs={savedJobs}
          tailored={tailored}
          onCreate={onCreate}
          busy={creating}
        />

        <div className="space-y-4">
          <StatsTable stats={stats} />

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-2">
              <h3 className="text-sm font-semibold">
                History ({apps.length})
              </h3>
            </div>
            {loading ? (
              <div className="p-6 text-sm text-slate-500">Loading…</div>
            ) : apps.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">
                No applications logged yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">Job</th>
                      <th className="px-3 py-2 text-left">Resume</th>
                      <th className="px-3 py-2 text-left">Applied</th>
                      <th className="px-3 py-2 text-left">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {apps.map((a) => (
                      <ApplicationRow
                        key={a.id}
                        app={a}
                        onChangeStatus={onChangeStatus}
                        onDelete={onDelete}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
