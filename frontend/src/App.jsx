import { useState } from 'react';
import clsx from 'clsx';
import {
  Cloud,
  Briefcase,
  FileText,
  LogIn,
  LogOut,
  User,
  Bell,
  ClipboardList,
} from 'lucide-react';
import JobsPage from './pages/JobsPage.jsx';
import TailorPage from './pages/TailorPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import ApplicationsPage from './pages/ApplicationsPage.jsx';
import AuthModal from './components/AuthModal.jsx';
import { useAuth } from './hooks/useAuth.jsx';

const TABS = [
  { id: 'jobs', label: 'Jobs', Icon: Briefcase, Page: JobsPage },
  { id: 'tailor', label: 'Tailor', Icon: FileText, Page: TailorPage },
  { id: 'alerts', label: 'Alerts', Icon: Bell, Page: AlertsPage },
  { id: 'applications', label: 'Applications', Icon: ClipboardList, Page: ApplicationsPage },
];

export default function App() {
  const [tab, setTab] = useState('jobs');
  const [authOpen, setAuthOpen] = useState(false);
  const { user, logout } = useAuth();

  const ActivePage = TABS.find((t) => t.id === tab)?.Page ?? JobsPage;

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
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}

            <span className="mx-2 hidden h-6 w-px bg-slate-200 sm:inline-block" />

            {user ? (
              <div className="flex items-center gap-1">
                <span className="hidden items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-600 sm:inline-flex">
                  <User className="h-3.5 w-3.5" />
                  {user.email}
                </span>
                <button type="button" className="btn-ghost" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                  <span className="ml-1 hidden sm:inline">Sign out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setAuthOpen(true)}
              >
                <LogIn className="h-4 w-4" />
                <span className="ml-1">Sign in</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <ActivePage />

      <footer className="mx-auto max-w-7xl px-4 py-6 text-xs text-slate-400">
        <p>
          Job data aggregated from third-party sources. Always verify postings on the
          original site and respect each provider's Terms of Service.
        </p>
      </footer>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
