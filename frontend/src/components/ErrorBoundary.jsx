import { Component } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Surface to console in dev; in prod, hook up to your monitoring tool
    // (Sentry, Honeybadger, etc.) by wiring it through here.
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-slate-600">
          The page hit an unexpected error. The team has been notified — you
          can usually recover by reloading.
        </p>
        <pre className="mx-auto mt-4 max-w-md overflow-auto rounded bg-slate-100 p-3 text-left text-xs text-slate-700">
          {String(this.state.error?.message ?? this.state.error)}
        </pre>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              this.reset();
              window.location.reload();
            }}
            className="btn-primary"
          >
            <RotateCw className="h-4 w-4" />
            <span className="ml-1">Reload</span>
          </button>
          <button type="button" onClick={this.reset} className="btn-ghost border border-slate-200">
            Try to recover
          </button>
        </div>
      </div>
    );
  }
}
