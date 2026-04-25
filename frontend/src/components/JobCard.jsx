import { Bookmark, BookmarkCheck, Building2, MapPin, Clock } from 'lucide-react';
import clsx from 'clsx';
import { timeAgo, formatSalary } from '../lib/format.js';

export default function JobCard({ job, saved, onToggleSave, onOpen }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency);

  return (
    <article
      className="card flex cursor-pointer flex-col gap-3 p-4 transition hover:shadow-md"
      onClick={() => onOpen?.(job)}
    >
      <header className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-100">
          {job.company_logo ? (
            <img
              src={job.company_logo}
              alt=""
              className="h-full w-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <Building2 className="h-5 w-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900">{job.title}</h3>
          <p className="text-sm text-slate-600">{job.company}</p>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSave?.(job);
          }}
          title={saved ? 'Unsave' : 'Save'}
        >
          {saved ? (
            <BookmarkCheck className="h-5 w-5 text-brand-600" />
          ) : (
            <Bookmark className="h-5 w-5" />
          )}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.location || 'Location N/A'}
          {job.is_remote && (
            <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
              Remote
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {timeAgo(job.posted_at ?? job.scraped_at)}
        </span>
        {salary && (
          <span className="font-medium text-slate-700">{salary}</span>
        )}
        {job.experience && <span className="badge">{job.experience}</span>}
      </div>

      {job.tech_stack_tags?.length ? (
        <div className="flex flex-wrap gap-1.5">
          {job.tech_stack_tags.slice(0, 8).map((tag) => (
            <span key={tag} className="badge-brand">
              {tag}
            </span>
          ))}
          {job.tech_stack_tags.length > 8 && (
            <span className="badge">+{job.tech_stack_tags.length - 8}</span>
          )}
        </div>
      ) : null}

      {job.description && (
        <p className={clsx('line-clamp-2 text-sm text-slate-600')}>
          {job.description.slice(0, 240)}
          {job.description.length > 240 ? '…' : ''}
        </p>
      )}
    </article>
  );
}
