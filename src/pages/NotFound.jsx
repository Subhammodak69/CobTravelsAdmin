import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900/90 p-10 text-center shadow-2xl shadow-slate-950/40">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
          <span className="text-4xl font-bold">404</span>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-blue-300/90">
          Page not found
        </p>
        <h1 className="text-3xl font-bold text-white">This page does not exist.</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          The link you followed may be broken, or the page may have been moved.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
          >
            <Home className="h-4 w-4" />
            Go to dashboard
          </Link>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 text-sm font-semibold text-white transition hover:border-slate-600 hover:bg-slate-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Go back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
