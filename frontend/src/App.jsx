import { useState } from 'react';
import clsx from 'clsx';
import { Cloud, Briefcase, FileText } from 'lucide-react';
import JobsPage from './pages/JobsPage.jsx';
import TailorPage from './pages/TailorPage.jsx';

const TABS = [
  { id: 'jobs', label: 'Jobs', Icon: Briefcase },
  { id: 'tailor', label: 'Tailor Resume', Icon: FileText },
];

export default function App() {
  const [tab, setTab] = useState('jobs');

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-white">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-tight">CloudOps Job Hunter</p>
              <p className="text-xs text-slate-500">
                Cloud / DevOps / SRE roles, refreshed every few hours
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                  tab === id
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {tab === 'jobs' ? <JobsPage /> : <TailorPage />}

      <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-400">
        <p>
          Job data aggregated from third-party sources. Always verify postings on the
          original site and respect each provider's Terms of Service.
        </p>
      </footer>
    </div>
  );
}
