import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { fetchTechStack } from '../lib/api.js';

const EXPERIENCE_LEVELS = ['Junior', 'Mid', 'Senior', 'Staff'];

export default function FiltersSidebar({ filters, onChange }) {
  const [tags, setTags] = useState([]);

  useEffect(() => {
    fetchTechStack().then(setTags).catch(() => setTags([]));
  }, []);

  const toggleTag = (tag) => {
    const next = new Set(filters.techStack || []);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    onChange({ ...filters, techStack: [...next] });
  };

  return (
    <aside className="card sticky top-4 h-fit p-4 text-sm">
      <h2 className="mb-3 text-base font-semibold">Filters</h2>

      <section className="mb-4">
        <label className="mb-1 block font-medium text-slate-700">Posted within</label>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={6}
            max={168}
            step={6}
            value={filters.hours ?? 48}
            onChange={(e) => onChange({ ...filters, hours: Number(e.target.value) })}
            className="w-full"
          />
          <span className="w-16 text-right text-xs text-slate-600">{filters.hours ?? 48}h</span>
        </div>
      </section>

      <section className="mb-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.remote === true}
            onChange={(e) =>
              onChange({ ...filters, remote: e.target.checked ? true : undefined })
            }
          />
          <span>Remote only</span>
        </label>
      </section>

      <section className="mb-4">
        <label className="mb-1 block font-medium text-slate-700">Min salary (USD)</label>
        <input
          type="number"
          min={0}
          step={5000}
          placeholder="e.g. 130000"
          value={filters.salaryMin ?? ''}
          onChange={(e) =>
            onChange({
              ...filters,
              salaryMin: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="input"
        />
      </section>

      <section className="mb-4">
        <label className="mb-1 block font-medium text-slate-700">Experience</label>
        <select
          className="input"
          value={filters.experience ?? ''}
          onChange={(e) => onChange({ ...filters, experience: e.target.value || undefined })}
        >
          <option value="">Any</option>
          {EXPERIENCE_LEVELS.map((lvl) => (
            <option key={lvl} value={lvl}>
              {lvl}
            </option>
          ))}
        </select>
      </section>

      <section className="mb-2">
        <div className="mb-1 flex items-center justify-between">
          <label className="font-medium text-slate-700">Tech stack</label>
          {filters.techStack?.length ? (
            <button
              type="button"
              className="text-xs text-brand-600 hover:underline"
              onClick={() => onChange({ ...filters, techStack: [] })}
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex max-h-64 flex-wrap gap-1.5 overflow-y-auto pr-1">
          {tags.map((tag) => {
            const active = filters.techStack?.includes(tag);
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
      </section>
    </aside>
  );
}
