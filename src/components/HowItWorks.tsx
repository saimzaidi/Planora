import React, { useState } from 'react';
import { Compass, Sparkles, Wallet, ArrowRight } from 'lucide-react';
import discoveryImage from '../assets/images/planora_local_activities_1790952858237.jpg';

interface HowItWorksProps {
  onStartPlanning: () => void;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ onStartPlanning }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const steps = [
    {
      number: '01',
      title: "Tell us what you're in the mood for.",
      description:
        "Select your emotional vibe—whether you crave low-key artisan coffee, a high-energy night with friends, or an art gallery wander.",
      icon: Compass,
      tagline: 'Vibe & crew matching',
    },
    {
      number: '02',
      title: 'We discover relevant events and activities.',
      description:
        'Planora screens your local perimeter for genuine neighborhood spots, pop-up events, cultural showcases, and scenic pauses.',
      icon: Sparkles,
      tagline: 'Real local discovery',
    },
    {
      number: '03',
      title: 'Get outing ideas that fit your budget.',
      description:
        'Receive realistic, cohesive outing blueprints calibrated strictly in PKR—no unexpected costs or awkward budget mismatches.',
      icon: Wallet,
      tagline: 'Transparent PKR estimates',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-[#FAFAFA] scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="max-w-2xl mx-auto lg:mx-0 mb-16 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 mb-2">
            <span>Simple 3-Step Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-display text-balance">
            How Planora turns your free hours into an effortless day out.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-neutral-600 leading-relaxed">
            No more endless WhatsApp group debates or scrolling unverified review sites. We simplify city outings into three thoughtful steps.
          </p>
        </div>

        {/* Grid: 3 Steps + Visual Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Steps List (7 columns) */}
          <div className="lg:col-span-7 space-y-6">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.number}
                  className="bg-white p-6 sm:p-7 rounded-2xl border border-neutral-200/80 shadow-xs hover:border-neutral-300 hover:shadow-sm transition-all duration-200 flex flex-col sm:flex-row gap-5 items-start"
                >
                  <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 border border-orange-100">
                    <Icon className="w-6 h-6" />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400">
                      <span className="font-mono tabular-nums text-neutral-900 font-bold">{step.number}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-neutral-500">{step.tagline}</span>
                    </div>

                    <h3 className="text-lg font-bold text-neutral-900 font-display">
                      {step.title}
                    </h3>

                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Supporting Visual Card (5 columns) */}
          <div className="lg:col-span-5">
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-md">
              <div className="relative rounded-xl overflow-hidden aspect-4/3 bg-neutral-100 mb-5">
                {!imageError ? (
                  <img
                    src={discoveryImage}
                    alt="Curated city outing essentials: map, coffee, sunglasses, and exhibition guide"
                    className={`w-full h-full object-cover transition-opacity duration-500 ${
                      imageLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageError(true)}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-orange-50/50">
                    <Sparkles className="w-8 h-8 text-orange-500 mb-2" />
                    <span className="text-xs font-semibold text-neutral-800">Local discovery tools</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 px-1 pb-1">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Authentic Outings</span>
                  <span className="font-semibold text-orange-600">Built for Pakistan</span>
                </div>
                <h4 className="text-base font-bold text-neutral-900">
                  Ready to step outside the usual circle?
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  From heritage walks in old quarters to boutique rooftop cafes in urban hubs, Planora helps you discover spots worth your time.
                </p>
                <div className="pt-3">
                  <button
                    onClick={onStartPlanning}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 text-xs font-semibold text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer"
                  >
                    <span>Try the Planning Engine</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
