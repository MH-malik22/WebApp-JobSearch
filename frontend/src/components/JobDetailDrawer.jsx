import { X, ExternalLink } from 'lucide-react';
import { timeAgo, formatSalary } from '../lib/format.js';

export default function JobDetailDrawer({ job, onClose }) {
  if (!job) return null;
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
        aria-hidden
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">{job.title}</h2>
            <p className="text-sm text-slate-600">
              {job.company} · {job.location || 'Location N/A'}
              {job.is_remote ? ' · Remote' : ''}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Posted {timeAgo(job.posted_at ?? job.scraped_at)}
              {salary ? ` · ${salary}` : ''}
              {job.experience ? ` · ${job.experience}` : ''}
            </p>
          </div>
          <button
            type="button"
            className="rounded p-1 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {job.tech_stack_tags?.length ? (
          <div className="flex flex-wrap gap-1.5 border-b border-slate-200 px-6 py-3">
            {job.tech_stack_tags.map((tag) => (
              <span key={tag} className="badge-brand">
                {tag}
              </span>
            ))}
          </div>
        ) : null}

        <div className="flex-1 overflow-y-auto whitespace-pre-wrap px-6 py-4 text-sm leading-relaxed text-slate-700">
          {job.description || 'No description available.'}
        </div>

        <footer className="border-t border-slate-200 px-6 py-3">
          <a
            href={job.apply_url}
            target="_blank"
            rel="noreferrer noopener"
            className="btn-primary w-full"
          >
            Apply on source
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </footer>
      </aside>
    </div>
  );
}
