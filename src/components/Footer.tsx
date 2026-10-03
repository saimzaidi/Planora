import React from 'react';
import { Compass } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className="bg-neutral-900 text-neutral-400 py-14 border-t border-neutral-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-neutral-800">
          {/* Brand info */}
          <div className="md:col-span-6 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center">
                <Compass className="w-4 h-4" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white font-display">
                Planora
              </span>
            </div>
            <p className="text-sm text-neutral-400 max-w-sm leading-relaxed">
              The local outing and event discovery platform. Planora helps you turn free time into thoughtfully curated days out with friends, partners, or solo.
            </p>
          </div>

          {/* Quick navigation */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Platform
            </div>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  onClick={() => scrollTo('planning-form')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Explore Plans
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('how-it-works')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  How It Works
                </button>
              </li>
              <li>
                <button
                  onClick={() => scrollTo('about')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  About Planora
                </button>
              </li>
            </ul>
          </div>

          {/* Philosophy / Region */}
          <div className="md:col-span-3 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-neutral-200">
              Focus
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Designed for local communities across Pakistan. Tailored by mood, validated in PKR, built for real life.
            </p>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div>
            © {new Date().getFullYear()} Planora. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <span>Discover Local</span>
            <span aria-hidden="true">·</span>
            <span>Live Vibrantly</span>
            <span aria-hidden="true">·</span>
            <span>Spend Intentionally</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
