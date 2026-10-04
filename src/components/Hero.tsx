import React, { useState } from 'react';
import { ArrowDown, MapPin, Sparkles, Calendar, HeartHandshake } from 'lucide-react';
import heroImage from '../assets/images/planora_hero_outing_1790952841705.jpg';

interface HeroProps {
  onFindPlan: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onFindPlan }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <section className="relative pt-12 pb-18 lg:pt-18 lg:pb-24 overflow-hidden">
      {/* Subtle warm background ambient glow */}
      <div 
        className="absolute top-12 left-1/2 -translate-x-1/2 w-[800px] h-[340px] bg-gradient-to-tr from-amber-100/60 via-orange-100/40 to-transparent blur-3xl -z-10 pointer-events-none" 
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Heading and CTAs */}
          <div className="lg:col-span-6 flex flex-col items-start space-y-6 max-w-xl">
            {/* Subtle editorial kicker - no pill badge */}
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Local Outing & Event Curator</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-neutral-900 leading-[1.12] font-display text-balance">
              Your next great day starts here.
            </h1>

            <p className="text-lg sm:text-xl text-neutral-600 leading-relaxed font-normal">
              Tell us your mood, your budget, and who's coming. We'll help you turn an ordinary day into a plan worth going out for.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full sm:w-auto">
              <button
                onClick={onFindPlan}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold tracking-wide text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 rounded-xl transition-all shadow-md shadow-orange-600/20 hover:shadow-lg hover:shadow-orange-600/30 active:scale-[0.99] cursor-pointer whitespace-nowrap"
              >
                <span>Find My Plan</span>
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Proof Highlights */}
            <div className="pt-4 border-t border-neutral-200/80 w-full grid grid-cols-3 gap-4 text-left">
              <div>
                <div className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums font-display">6</div>
                <div className="text-xs text-neutral-500 font-medium">Curated Moods</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums font-display">100%</div>
                <div className="text-xs text-neutral-500 font-medium">Budget Aligned</div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-neutral-900 tabular-nums font-display">Instant</div>
                <div className="text-xs text-neutral-500 font-medium">Day Outlines</div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Composition with Fallback */}
          <div className="lg:col-span-6 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              {/* Outer frame styling */}
              <div className="relative rounded-2xl overflow-hidden border border-neutral-200 bg-white shadow-xl shadow-neutral-900/5 aspect-16/10">
                {!imageError ? (
                  <img
                    src={heroImage}
                    alt="Friends gathering for an evening outing at a vibrant outdoor city spot"
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-amber-50 p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mb-4">
                      <Sparkles className="w-7 h-7" />
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900 mb-1">Discover Local Gatherings</h2>
                    <p className="text-xs text-neutral-500 max-w-xs">
                      Coffee meetups, cultural pop-ups, open-air concerts, and scenic spots tailored to your budget.
                    </p>
                  </div>
                )}

                {/* Subtle scrim overlay at bottom */}
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-neutral-950/70 via-neutral-950/30 to-transparent pointer-events-none" />

                {/* Editorial caption overlay */}
                <div className="absolute bottom-4 left-4 right-4 text-white flex items-center justify-between text-xs pointer-events-none">
                  <div className="flex items-center gap-1.5 font-medium drop-shadow-sm">
                    <MapPin className="w-3.5 h-3.5 text-orange-400" />
                    <span>Real-world spaces & evening energy</span>
                  </div>
                  <div className="text-neutral-300 drop-shadow-sm hidden sm:block">
                    Curated for your crew
                  </div>
                </div>
              </div>

              {/* Floating accent preview card */}
              <div className="absolute -bottom-6 left-2 sm:-bottom-6 sm:-left-6 bg-white p-3.5 sm:p-4 rounded-xl shadow-lg border border-neutral-200/90 flex items-center gap-3 max-w-xs transition-transform hover:-translate-y-0.5">
                <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-900">Seamless Outing Planning</div>
                  <div className="text-[11px] text-neutral-500">Pick your mood and PKR budget</div>
                </div>
              </div>

              {/* Floating accent 2: Group friendly */}
              <div className="absolute -top-4 -right-4 bg-white px-3.5 py-2 rounded-xl shadow-md border border-neutral-200/90 hidden sm:flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-neutral-800">Solo to group-ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
