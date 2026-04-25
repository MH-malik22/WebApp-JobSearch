import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, Loader2 } from 'lucide-react';
import FiltersSidebar from '../components/FiltersSidebar.jsx';
import JobCard from '../components/JobCard.jsx';
import JobDetailDrawer from '../components/JobDetailDrawer.jsx';
import { fetchJobs, refreshJobs } from '../lib/api.js';
import { useSavedJobs } from '../hooks/useSavedJobs.js';

const DEFAULT_FILTERS = { hours: 48, sort: 'recent', techStack: [] };

export default function JobsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [search, setSearch] = useState('');
  const [data, setData] = useState({ jobs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [openJob, setOpenJob] = useState(null);
  const { isSaved, toggle } = useSavedJobs();

  const queryParams = useMemo(() => {
    const params = { ...filters };
    if (search.trim()) params.search = search.trim();
    if (Array.isArray(params.techStack)) params.techStack = params.techStack.join(',');
    return params;
  }, [filters, search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchJobs(queryParams)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshJobs();
      setTimeout(() => {
        fetchJobs(queryParams).then(setData);
      }, 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setTimeout(() => setRefreshing(false), 1500);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Latest Cloud / DevOps roles</h1>
          <p className="text-sm text-slate-600">
            {data.total} job{data.total === 1 ? '' : 's'} from the last {filters.hours}h
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search title or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-8 sm:w-72"
            />
          </div>
          <select
            className="input sm:w-44"
            value={filters.sort}
            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
          >
            <option value="recent">Most recent</option>
            <option value="salary">Salary high–low</option>
          </select>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-ghost border border-slate-200"
            title="Trigger fresh scrape"
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <FiltersSidebar filters={filters} onChange={setFilters} />

        <main>
          {error ? (
            <div className="card p-6 text-sm text-red-700">
              Failed to load jobs: {error}
            </div>
          ) : loading ? (
            <div className="card flex items-center justify-center p-12 text-slate-500">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading jobs…
            </div>
          ) : data.jobs.length === 0 ? (
            <div className="card p-12 text-center text-slate-500">
              <p className="text-base font-medium">No jobs match your filters.</p>
              <p className="mt-1 text-sm">
                Try widening the time range or clearing tech-stack filters.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {data.jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  saved={isSaved(job.id)}
                  onToggleSave={toggle}
                  onOpen={setOpenJob}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <JobDetailDrawer job={openJob} onClose={() => setOpenJob(null)} />
    </div>
  );
}
