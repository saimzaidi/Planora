import React from 'react';
import { Compass, ShieldCheck, Heart, Sparkles, MapPin } from 'lucide-react';

export const AboutSection: React.FC = () => {
  return (
    <section id="about" className="py-20 lg:py-28 bg-white border-t border-neutral-200 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-orange-600">
            <Compass className="w-3.5 h-3.5" />
            <span>The Story Behind Planora</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-display text-balance">
            Reclaiming the joy of spontaneous days out.
          </h2>

          <p className="text-base sm:text-lg text-neutral-600 leading-relaxed">
            Most weekends in our cities get lost to the same routine: sitting on a couch debating where to go, texting three different friends, and ending up at the exact same spot because nobody has the energy to plan.
          </p>
        </div>

        {/* 3 Pillars of Planora */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-5xl mx-auto">
          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/90 text-left space-y-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 font-display">
              Mood-Driven Curation
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              We start with how you feel right now. A rainy solo Sunday needs a completely different itinerary than a lively Friday night with old friends.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/90 text-left space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 font-display">
              Grounded in Real PKR Budgets
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              No generic dollar amounts or unrealistic luxury recommendations. We treat local spending reality with clarity and respect.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-neutral-50 border border-neutral-200/90 text-left space-y-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-neutral-900 font-display">
              Practical Outing Sequences
            </h3>
            <p className="text-sm text-neutral-600 leading-relaxed">
              Rather than scattering disconnected restaurant links, we combine activities that make geographic and chronological sense together.
            </p>
          </div>
        </div>

        {/* Small location footprint */}
        <div className="mt-14 pt-10 border-t border-neutral-200 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-600" />
            <span>Currently focused on Pakistani urban hubs: Lahore, Karachi, Islamabad & Rawalpindi.</span>
          </div>
        </div>
      </div>
    </section>
  );
};
