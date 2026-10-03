import React, { useState } from 'react';
import { Compass, Menu, X, ArrowUpRight } from 'lucide-react';

interface NavbarProps {
  onStartPlanning: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onStartPlanning }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-[#FAFAFA]/90 backdrop-blur-md border-b border-neutral-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Zone 1: Brand wordmark */}
        <a 
          href="#" 
          className="flex items-center gap-2.5 group focus-visible:rounded-lg focus-visible:outline-2"
          aria-label="Planora Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-sm shadow-orange-500/20 group-hover:scale-105 transition-transform duration-200">
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-neutral-900 font-display">
            Planora
          </span>
        </a>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600">
          <button
            onClick={() => scrollToSection('planning-form')}
            className="hover:text-neutral-900 transition-colors cursor-pointer py-1"
          >
            Explore
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-neutral-900 transition-colors cursor-pointer py-1"
          >
            How it works
          </button>
          <button
            onClick={() => scrollToSection('about')}
            className="hover:text-neutral-900 transition-colors cursor-pointer py-1"
          >
            About
          </button>
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onStartPlanning}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold tracking-wide text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all shadow-sm hover:shadow active:scale-[0.99] whitespace-nowrap cursor-pointer"
          >
            <span>Start Planning</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white" />
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-neutral-200 bg-white/95 backdrop-blur-md px-6 py-6 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col gap-4 text-base font-medium text-neutral-800">
            <button
              onClick={() => scrollToSection('planning-form')}
              className="text-left py-2 hover:text-orange-600 transition-colors border-b border-neutral-100"
            >
              Explore
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-left py-2 hover:text-orange-600 transition-colors border-b border-neutral-100"
            >
              How it works
            </button>
            <button
              onClick={() => scrollToSection('about')}
              className="text-left py-2 hover:text-orange-600 transition-colors border-b border-neutral-100"
            >
              About
            </button>
            <div className="pt-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartPlanning();
                }}
                className="w-full text-center py-3 text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors shadow-sm"
              >
                Start Planning
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
