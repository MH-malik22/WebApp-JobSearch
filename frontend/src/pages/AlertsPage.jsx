import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { Bell, Trash2, Loader2, Plus, Mail } from 'lucide-react';
import {
  createAlert,
  deleteAlert,
  fetchAlerts,
  fetchTechStack,
  updateAlert,
} from '../lib/api.js';
import { useAuth } from '../hooks/useAuth.jsx';

const DELIVERY_OPTIONS = [
  { value: 'instant', label: 'Instant' },
  { value: 'digest', label: 'Daily digest' },
  { value: 'both', label: 'Both' },
  { value: 'off', label: 'Off' },
];

const EMPTY = {
  name: '',
  keywords: '',
  techStack: [],
  remoteOnly: false,
  salaryMin: '',
  experience: '',
  delivery: 'digest',
  enabled: true,
};

function AlertForm({ value, onChange, onSubmit, busy, tags, mode }) {
  const toggleTag = (tag) => {
    const next = new Set(value.techStack);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    onChange({ ...value, techStack: [...next] });
  };

  return (
    <form className="space-y-3" onSubmit={onSubmit}>
      <input
        type="text"
        required
        placeholder='Alert name (e.g. "Senior SRE remote")'
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        className="input"
      />
      <input
        type="text"
        placeholder="Keywords (full-text — title + description)"
        value={value.keywords ?? ''}
        onChange={(e) => onChange({ ...value, keywords: e.target.value })}
        className="input"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          min={0}
          step={5000}
          placeholder="Min salary (USD)"
          value={value.salaryMin ?? ''}
          onChange={(e) =>
            onChange({
              ...value,
              salaryMin: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="input text-sm"
        />
        <input
          type="text"
          placeholder="Experience (e.g. Senior)"
          value={value.experience ?? ''}
          onChange={(e) => onChange({ ...value, experience: e.target.value })}
          className="input text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.remoteOnly}
          onChange={(e) => onChange({ ...value, remoteOnly: e.target.checked })}
        />
        Remote only
      </label>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Tech stack</p>
        <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {tags.map((tag) => {
            const active = value.techStack?.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'rounded-md px-2 py-1 text-xs ring-1 ring-inset transition',
                  active
                    ? 'bg-brand-600 text-white ring-brand-600'
                    : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Delivery</p>
        <div className="flex flex-wrap gap-2">
          {DELIVERY_OPTIONS.map(({ value: v, label }) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ ...value, delivery: v })}
              className={clsx(
                'rounded-md px-2.5 py-1 text-xs ring-1 ring-inset',
                value.delivery === v
                  ? 'bg-brand-600 text-white ring-brand-600'
                  : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4" />
            <span className="ml-1">{mode === 'edit' ? 'Save changes' : 'Create alert'}</span>
          </>
        )}
      </button>
    </form>
  );
}

function AlertCard({ alert, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    name: alert.name,
    keywords: alert.keywords,
    techStack: alert.tech_stack_tags ?? [],
    remoteOnly: alert.remote_only,
    salaryMin: alert.salary_min,
    experience: alert.experience,
    delivery: alert.delivery,
    enabled: alert.enabled,
  });
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (editing && tags.length === 0) {
      fetchTechStack().then(setTags).catch(() => {});
    }
  }, [editing, tags.length]);

  const submit = async (e) => {
    e.preventDefault();
    await onUpdate(alert.id, draft);
    setEditing(false);
  };

  const toggleEnabled = async () => {
    await onUpdate(alert.id, { enabled: !alert.enabled });
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">{alert.name}</h3>
            <span
              className={clsx(
                'badge',
                alert.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-500'
              )}
            >
              {alert.enabled ? 'enabled' : 'paused'}
            </span>
            <span className="badge">{alert.delivery}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {alert.keywords ? `"${alert.keywords}"` : 'No keywords'}
            {alert.remote_only && ' · Remote'}
            {alert.salary_min && ` · $${alert.salary_min.toLocaleString()}+`}
            {alert.experience && ` · ${alert.experience}`}
          </p>
          {alert.tech_stack_tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {alert.tech_stack_tags.map((t) => (
                <span key={t} className="badge-brand">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <div className="flex flex-shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={toggleEnabled}
            className="btn-ghost text-xs"
            title={alert.enabled ? 'Pause' : 'Resume'}
          >
            {alert.enabled ? 'Pause' : 'Resume'}
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="btn-ghost text-xs"
          >
            {editing ? 'Cancel' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(alert.id)}
            className="btn-ghost text-red-600 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-4 border-t border-slate-200 pt-4">
          <AlertForm
            value={draft}
            onChange={setDraft}
            onSubmit={submit}
            tags={tags}
            mode="edit"
          />
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [tags, setTags] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchAlerts(), fetchTechStack()])
      .then(([a, t]) => {
        setAlerts(a);
        setTags(t);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  const onCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload = {
        ...draft,
        salaryMin: draft.salaryMin ? Number(draft.salaryMin) : null,
      };
      const a = await createAlert(payload);
      setAlerts((cur) => [a, ...cur]);
      setDraft(EMPTY);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setCreating(false);
    }
  };

  const onUpdate = async (id, payload) => {
    const a = await updateAlert(id, payload);
    setAlerts((cur) => cur.map((x) => (x.id === id ? a : x)));
  };

  const onDelete = async (id) => {
    if (!confirm('Delete this alert? This cannot be undone.')) return;
    await deleteAlert(id);
    setAlerts((cur) => cur.filter((x) => x.id !== id));
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Bell className="mx-auto mb-3 h-10 w-10 text-brand-600" />
        <h1 className="text-2xl font-semibold">Job alerts</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to set up email alerts when new jobs match your criteria.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Job alerts</h1>
        <p className="text-sm text-slate-600">
          Get notified when new jobs match your criteria — instantly, in a daily digest, or both.
        </p>
        <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
          <Mail className="h-3.5 w-3.5" />
          Emails go to <strong className="ml-1">{user.email}</strong>.
        </p>
      </div>

      {error && (
        <div className="card mb-4 border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">New alert</h2>
          <AlertForm
            value={draft}
            onChange={setDraft}
            onSubmit={onCreate}
            busy={creating}
            tags={tags}
          />
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold">
            Active alerts ({alerts.length})
          </h2>
          {loading ? (
            <div className="card p-6 text-sm text-slate-500">Loading…</div>
          ) : alerts.length === 0 ? (
            <div className="card p-6 text-sm text-slate-500">
              No alerts yet. Create one to start getting notifications.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map((a) => (
                <AlertCard
                  key={a.id}
                  alert={a}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
