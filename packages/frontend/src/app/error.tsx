'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[YEMS Boundary Error]:', error);
  }, [error]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center px-4 overflow-hidden bg-[#0c0608]">
      {/* Background Image / Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 scale-105"
        style={{ backgroundImage: `url('/assets/background_login.jpg')` }}
      />
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(30, 8, 16, 0.95) 0%, rgba(15, 4, 8, 0.98) 100%)'
        }}
      />

      {/* Floating Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#7b1d3c]/20 blur-[120px] animate-blob-1 pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#9b2d54]/20 blur-[140px] animate-blob-2 pointer-events-none" />

      {/* Premium Glass Card */}
      <div 
        className="relative w-full max-w-lg rounded-3xl border shadow-2xl p-12 text-center card-pop-in z-10"
        style={{
          background: 'rgba(255, 255, 255, 0.04)',
          backdropFilter: 'blur(25px) saturate(160%)',
          WebkitBackdropFilter: 'blur(25px) saturate(160%)',
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }}
      >
        {/* Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full" />

        {/* Error Icon badge */}
        <div className="mb-6 inline-flex p-4 bg-red-500/10 rounded-2xl border border-red-500/20 text-red-500 shadow-inner">
          <ShieldAlert className="h-12 w-12 animate-pulse" />
        </div>

        <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
          System Interruption
        </h1>
        <p className="text-sm text-white/50 uppercase tracking-widest font-semibold mb-6">
          500 – Internal Error
        </p>

        <p className="text-white/60 text-sm max-w-md mx-auto mb-8 leading-relaxed">
          An unexpected error occurred during execution. Our engineering team has been notified. You can attempt to refresh the page or return to the safety of the homepage.
        </p>

        {error.message && (
          <div className="mb-8 p-4 bg-black/40 rounded-xl border border-white/5 text-left font-mono text-xs text-red-300 max-h-[120px] overflow-y-auto break-all">
            <span className="text-white/40 block mb-1 font-sans font-semibold">Error details:</span>
            {error.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7b1d3c] to-[#9b2d54] hover:brightness-110 text-white font-medium text-sm shadow-lg shadow-maroon/20 transition-all duration-300 hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <RefreshCw className="h-4 w-4 animate-spin-slow" /> Try Again
          </button>
          
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all duration-300 active:scale-95"
          >
            <Home className="h-4 w-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
