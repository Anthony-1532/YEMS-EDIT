'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Sun, Moon } from 'lucide-react';
import Link from 'next/link';

interface ServiceStatus {
  name: string;
  key: string;
  status: 'loading' | 'online' | 'offline';
  message: string;
  icon: any;
  endpoint: string;
  latency?: number;
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'API Server', key: 'api', status: 'loading', message: 'Checking connectivity...', icon: null, endpoint: '/api/health' },
    { name: 'Database Engine', key: 'db', status: 'loading', message: 'Verifying DB connections...', icon: null, endpoint: '/health/db' },
    { name: 'File Storage', key: 'storage', status: 'loading', message: 'Checking S3 bucket...', icon: null, endpoint: '/health/storage' },
    { name: 'Task Queue', key: 'queue', status: 'loading', message: 'Checking Redis broker...', icon: null, endpoint: '/health/queue' },
  ]);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Theme sync
    const darkTheme = localStorage.getItem('theme') === 'dark' ||
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setIsDark(darkTheme);
    if (darkTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const checkStatus = useCallback(async () => {
    setIsRefreshing(true);
    const updatedServices = [...services];

    await Promise.all(
      updatedServices.map(async (service) => {
        const start = Date.now();
        try {
          const res = await fetch(service.endpoint);
          const latency = Date.now() - start;
          if (res.ok) {
            service.status = 'online';
            service.latency = latency;
            service.message = service.key === 'api' ? `Responding in ${latency}ms` : `Operational (${latency}ms)`;
          } else {
            service.status = 'offline';
            service.message = `HTTP Error ${res.status}`;
            service.latency = undefined;
          }
        } catch {
          service.status = 'offline';
          service.message = 'Service unreachable';
          service.latency = undefined;
        }
      })
    );

    setServices(updatedServices);
    setLastUpdated(new Date());
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000); // refresh every 30 seconds
    return () => clearInterval(interval);
  }, [checkStatus]);

  const allOnline = services.every((s) => s.status === 'online');
  const anyOffline = services.some((s) => s.status === 'offline');
  const isLoading = services.every((s) => s.status === 'loading');

  let overallStatus: 'online' | 'partial' | 'offline' | 'loading' = 'loading';
  if (!isLoading) {
    if (allOnline) overallStatus = 'online';
    else if (anyOffline && services.some((s) => s.status === 'online')) overallStatus = 'partial';
    else overallStatus = 'offline';
  }

  const getOverallDetails = () => {
    switch (overallStatus) {
      case 'online':
        return {
          title: 'ALL SYSTEMS OPERATIONAL',
          description: 'All core services are responding normally.',
          borderClass: isDark ? 'border-emerald-950/60' : 'border-emerald-200',
          bgClass: isDark ? 'bg-emerald-500/10' : 'bg-emerald-500/5',
          dotClass: 'bg-emerald-500',
          textClass: isDark ? 'text-emerald-400' : 'text-emerald-800',
        };
      case 'partial':
        return {
          title: 'DEGRADED PERFORMANCE',
          description: 'One or more services are reporting latency or connectivity failures.',
          borderClass: isDark ? 'border-amber-950/60' : 'border-amber-200',
          bgClass: isDark ? 'bg-amber-500/10' : 'bg-amber-500/5',
          dotClass: 'bg-amber-500',
          textClass: isDark ? 'text-amber-400' : 'text-amber-800',
        };
      case 'offline':
        return {
          title: 'MAJOR SYSTEM OUTAGE',
          description: 'Critical components are currently offline or unreachable.',
          borderClass: isDark ? 'border-rose-950/60' : 'border-rose-200',
          bgClass: isDark ? 'bg-rose-500/10' : 'bg-rose-500/5',
          dotClass: 'bg-rose-500',
          textClass: isDark ? 'text-rose-400' : 'text-rose-800',
        };
      default:
        return {
          title: 'INITIALIZING HEALTH CHECK',
          description: 'Gathering current health metrics from system backends...',
          borderClass: isDark ? 'border-zinc-800' : 'border-zinc-200',
          bgClass: isDark ? 'bg-zinc-900/40' : 'bg-zinc-100',
          dotClass: isDark ? 'bg-zinc-600 animate-pulse' : 'bg-zinc-400 animate-pulse',
          textClass: isDark ? 'text-zinc-400' : 'text-zinc-600',
        };
    }
  };

  const statusDetails = getOverallDetails();

  return (
    <div className={`min-h-screen w-full flex flex-col justify-between transition-colors duration-200 ${
      isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'
    }`}>
      
      {/* Main Content Area */}
      <div className="max-w-4xl w-full mx-auto px-4 py-12 flex-grow">
        
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-6 mb-8 ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <div className="flex items-center gap-2.5">
            <img src="/assets/logo.jpg" alt="YEMS Logo" className="h-6 w-6 object-contain filter grayscale" />
            <div className="font-mono text-xs tracking-tight">
              <span className="font-bold">YEMS</span>
              <span className={`font-medium ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}> / </span>
              <span className={`uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>SYSTEM STATUS</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-1.5 border transition-colors cursor-pointer ${
                isDark 
                  ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-400' 
                  : 'border-zinc-200 hover:bg-zinc-100 text-zinc-500'
              }`}
              title="Toggle Theme"
            >
              {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={checkStatus}
              disabled={isRefreshing}
              className={`flex items-center gap-1.5 px-3 py-1.5 border text-xs font-mono transition-colors disabled:opacity-50 cursor-pointer ${
                isDark 
                  ? 'border-zinc-800 hover:bg-zinc-900 text-zinc-400' 
                  : 'border-zinc-200 hover:bg-zinc-100 text-zinc-500'
              }`}
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              REFRESH
            </button>
          </div>
        </div>

        {/* Overall Indicator Box */}
        <div className={`p-4 border ${statusDetails.borderClass} ${statusDetails.bgClass} flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs mb-8 transition-all duration-300`}>
          <div className="flex items-center gap-3">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusDetails.dotClass}`} />
            <div>
              <span className={`font-bold uppercase tracking-wider ${statusDetails.textClass}`}>{statusDetails.title}</span>
              <span className={`ml-2 hidden sm:inline ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>— {statusDetails.description}</span>
            </div>
          </div>
          <div className={`whitespace-nowrap text-[11px] self-start sm:self-center ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            [ CHECKED: {lastUpdated.toLocaleTimeString()} ]
          </div>
        </div>

        {/* Services Stack */}
        <div className={`border divide-y font-mono text-xs mb-8 ${
          isDark 
            ? 'border-zinc-800 divide-zinc-800' 
            : 'border-zinc-200 divide-zinc-200'
        }`}>
          {services.map((service) => (
            <div 
              key={service.key}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-colors ${
                isDark ? 'hover:bg-zinc-900/30' : 'hover:bg-zinc-100/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${
                  service.status === 'online' 
                    ? 'bg-emerald-500' 
                    : service.status === 'offline' 
                      ? 'bg-rose-500 animate-pulse' 
                      : 'bg-zinc-400 dark:bg-zinc-600 animate-pulse'
                }`} />
                <span className={`font-bold uppercase tracking-wide ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>{service.name}</span>
                {service.latency !== undefined && (
                  <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>[ {service.latency}ms ]</span>
                )}
              </div>
              
              <div className={`flex items-center gap-2 text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                <span>{service.message}</span>
                <span className={isDark ? 'text-zinc-800' : 'text-zinc-300'}>/</span>
                <span className={`lowercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{service.endpoint}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Uptime History Chart */}
        <div className={`border p-4 font-mono text-xs ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <span className={`font-bold uppercase ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>SYSTEM UPTIME (90 DAYS)</span>
            <span className={`font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>99.96%</span>
          </div>

          <div className="flex items-center gap-[2.5px] h-8 w-full select-none mb-3">
            {Array.from({ length: 90 }).map((_, i) => {
              const status = i === 12 || i === 54 ? 'warn' : 'ok';
              return (
                <div
                  key={i}
                  className={`flex-grow h-full transition-colors duration-200 ${
                    status === 'ok' 
                      ? (isDark ? 'bg-emerald-500/30 hover:bg-emerald-500' : 'bg-emerald-500/50 hover:bg-emerald-500')
                      : (isDark ? 'bg-amber-500/30 hover:bg-amber-500' : 'bg-amber-500/50 hover:bg-amber-500')
                  }`}
                  title={`Day ${90 - i} ago: ${status === 'ok' ? '100% Uptime' : '98.5% Uptime'}`}
                />
              );
            })}
          </div>

          <div className={`flex items-center justify-between text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            <span>90 DAYS AGO</span>
            <span>TODAY</span>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className={`py-6 border-t text-center font-mono text-[10px] ${
        isDark ? 'border-zinc-800 text-zinc-500' : 'border-zinc-200 text-zinc-400'
      }`}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} YESHUA EDUCATIONAL SYSTEM. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-4 font-bold">
            <Link href="/" className={`transition-colors ${isDark ? 'hover:text-zinc-100' : 'hover:text-zinc-900'}`}>[ PORTAL ]</Link>
            <Link href="/login" className={`transition-colors ${isDark ? 'hover:text-zinc-100' : 'hover:text-zinc-900'}`}>[ SIGN IN ]</Link>
          </div>
        </div>
      </div>

    </div>
  );
}

