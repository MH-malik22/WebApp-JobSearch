import { Compass } from 'lucide-react';

export default function NotFound({ onHome }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Compass className="mx-auto mb-3 h-10 w-10 text-slate-400" />
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm text-slate-600">
        That tab doesn't exist. Pick one from the header, or jump back to the
        Jobs view.
      </p>
      {onHome && (
        <button type="button" onClick={onHome} className="btn-primary mt-5">
          Back to Jobs
        </button>
      )}
    </div>
  );
}
