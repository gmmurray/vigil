import { Activity, Check, Cpu, Shield, Terminal, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

interface SystemCheck {
  id: string;
  label: string;
  status: 'pending' | 'ok';
  delay: number;
}

export function LandingView() {
  const [checks, setChecks] = useState<SystemCheck[]>([
    {
      id: 'worker',
      label: 'WORKER_ENV_CONFIGURED',
      status: 'pending',
      delay: 500,
    },
    {
      id: 'db',
      label: 'D1_DATABASE_ESTABLISHED',
      status: 'pending',
      delay: 1200,
    },
    {
      id: 'do',
      label: 'DURABLE_OBJECT_NAMESPACE',
      status: 'pending',
      delay: 1800,
    },
    {
      id: 'auth',
      label: 'CLOUDFLARE_ACCESS_SESSION',
      status: 'pending',
      delay: 2400,
    },
  ]);

  const [bootComplete, setBootComplete] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  // Honest System Info
  const appVersion = 'v1.0.0';
  const environment = import.meta.env.MODE.toUpperCase();
  const cores =
    typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 'N/A';

  const getClientInfo = () => {
    if (typeof navigator === 'undefined') return 'UNKNOWN';
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) return 'MACOS_CLIENT';
    if (ua.includes('Win')) return 'WINDOWS_CLIENT';
    if (ua.includes('Linux')) return 'LINUX_CLIENT';
    return 'WEB_CLIENT';
  };

  useEffect(() => {
    let mounted = true;
    const start = performance.now();
    fetch(window.location.origin, { method: 'HEAD' })
      .then(() => {
        if (mounted) setLatency(Math.round(performance.now() - start));
      })
      .catch(() => {
        if (mounted) setLatency(0);
      });
    // Simulate boot sequence
    const timers = checks.map(check => {
      return setTimeout(() => {
        if (mounted) {
          setChecks(prev =>
            prev.map(c => (c.id === check.id ? { ...c, status: 'ok' } : c)),
          );
        }
      }, check.delay);
    });

    // Enable "Enter" button after last check
    const finalTimer = setTimeout(() => {
      if (mounted) setBootComplete(true);
    }, 2800);

    return () => {
      mounted = false;
      timers.forEach(t => {
        clearTimeout(t);
      });
      clearTimeout(finalTimer);
    };
  }, [checks.map]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-4xl mx-auto px-6 py-12 animate-in fade-in duration-1000">
      <div className="flex flex-col items-center mb-16 space-y-6 text-center">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gold-primary/20 rounded-full blur-md group-hover:bg-gold-primary/30 transition-all duration-500"></div>
          <img
            src="/logo_transparent.png"
            alt="Vigil Logo"
            className="relative h-24 w-24 object-contain opacity-90 sepia-[.5] hue-rotate-15 contrast-125"
          />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter text-gold-primary uppercase [text-shadow:0_0_10px_rgba(220,165,76,0.5)]">
            VIGIL <span className="text-gold-dim">{`//`}</span> SYSTEM
            INITIALIZED
          </h1>
          <p className="text-gold-dim font-mono text-sm uppercase tracking-widest opacity-80">
            Serverless Uptime Monitoring Solution
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <div className="panel flex flex-col justify-between min-h-62.5">
          <div className="flex items-center gap-2 mb-6 border-b border-gold-faint pb-2">
            <Terminal className="w-5 h-5 text-gold-primary" />
            <span className="font-mono font-bold text-gold-primary uppercase tracking-wider">
              Boot Sequence
            </span>
          </div>

          <div className="space-y-3 font-mono text-sm">
            {checks.map(check => (
              <div
                key={check.id}
                className="flex items-center justify-between group"
              >
                <span
                  className={`transition-colors duration-300 ${check.status === 'ok' ? 'text-gold-dim' : 'text-zinc-600'}`}
                >
                  {check.label}
                </span>
                <span className="flex items-center gap-2">
                  {check.status === 'ok' ? (
                    <>
                      <span className="text-retro-green tracking-widest">
                        [OK]
                      </span>
                      <Check className="w-4 h-4 text-retro-green" />
                    </>
                  ) : (
                    <span className="text-gold-faint animate-pulse">...</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: System Info */}
        <div className="panel flex flex-col justify-between min-h-62.5">
          <div className="flex items-center gap-2 mb-6 border-b border-gold-faint pb-2">
            <Cpu className="w-5 h-5 text-gold-primary" />
            <span className="font-mono font-bold text-gold-primary uppercase tracking-wider">
              System Info
            </span>
          </div>

          <div className="space-y-4 font-mono text-sm">
            <div className="flex justify-between items-center border-b border-gold-faint/30 pb-2">
              <span className="text-gold-dim">VERSION</span>
              <span className="text-gold-primary">{appVersion}</span>
            </div>
            <div className="flex justify-between items-center border-b border-gold-faint/30 pb-2">
              <span className="text-gold-dim">CLIENT</span>
              <span className="text-gold-primary">{getClientInfo()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gold-dim">LATENCY</span>
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                {latency !== null ? (
                  `${latency}ms`
                ) : (
                  <span className="animate-pulse">...</span>
                )}
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gold-dim">CORES</span>
              <div className="flex items-center gap-2">{cores} THREADS</div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gold-dim">BUILD_ENV</span>
              <div className="flex items-center gap-2 text-retro-green">
                <Shield className="w-3 h-3" />
                <span>{environment}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Area */}
      <div
        className={`mt-12 transition-all duration-1000 transform ${bootComplete ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      >
        <Link
          to="/dashboard"
          className="btn-gold text-lg px-12 py-4 border-2 flex items-center gap-3 group bg-void/50 backdrop-blur-sm"
        >
          <Zap className="w-5 h-5 group-hover:text-void transition-colors" />
          <span>Initialize Monitoring</span>
          <Zap className="w-5 h-5 group-hover:text-void transition-colors" />
        </Link>

        <p className="mt-4 text-center text-gold-faint text-xs font-mono uppercase tracking-widest">
          Secure Connection Established
        </p>
      </div>
    </div>
  );
}
