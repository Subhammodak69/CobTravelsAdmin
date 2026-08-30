import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ServerUnavailable = () => {
  const navigate = useNavigate();

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-xl rounded-3xl border border-amber-500/30 bg-slate-900/90 p-10 text-center shadow-2xl shadow-amber-900/20">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
          <AlertTriangle className="h-9 w-9" />
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-amber-300/90">
          Service unavailable
        </p>
        <h1 className="text-3xl font-bold text-white">The server could not be reached.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          We could not establish a connection to the admin backend. Please check your internet connection or try again in a moment.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>

          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-700"
          >
            Back to login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServerUnavailable;
