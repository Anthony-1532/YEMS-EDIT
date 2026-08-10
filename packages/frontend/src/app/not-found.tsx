'use client';

import Link from 'next/link';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
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

        {/* 404 Number with abstract decoration */}
        <div className="relative mb-6 select-none">
          <h1 className="text-[140px] font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-b from-white to-white/10 leading-none">
            404
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold tracking-widest uppercase text-[#9b2d54] bg-[#0c0608] px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
              Page Not Found
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
          Lost in the Hallways?
        </h2>
        <p className="text-white/60 text-sm max-w-md mx-auto mb-8 leading-relaxed">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable. Let&apos;s get you back on course.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-medium text-sm transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
          
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#7b1d3c] to-[#9b2d54] hover:brightness-110 text-white font-medium text-sm shadow-lg shadow-maroon/20 transition-all duration-300 hover:scale-[1.02] active:scale-95"
          >
            <Home className="h-4 w-4" /> Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
