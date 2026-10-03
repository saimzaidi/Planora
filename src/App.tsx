import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { PlanningForm } from './components/PlanningForm';
import { HowItWorks } from './components/HowItWorks';
import { AboutSection } from './components/AboutSection';
import { Footer } from './components/Footer';
import { PlanoraPreferences, OutingDataResponse, RecommendationResponse, OutingPlansResponse } from './types';

export default function App() {
  // Source of truth for the user's structured preferences
  const [userPreferences, setUserPreferences] = useState<PlanoraPreferences | null>(null);

  // Normalized real-world data response (places and events)
  const [outingData, setOutingData] = useState<OutingDataResponse | null>(null);

  // Gemini recommendation response based strictly on verified items
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);

  // Complete multi-stop outing plans (Chunk 4B)
  const [outingPlans, setOutingPlans] = useState<OutingPlansResponse | null>(null);

  // In-app quota handling for Google Maps Platform Demo Key (Section 8)
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  const handleScrollToForm = () => {
    const el = document.getElementById('planning-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-neutral-900 selection:bg-orange-100 selection:text-orange-900">
      {/* Quota Notification Banner if Demo Key daily limit is reached */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <Navbar onStartPlanning={handleScrollToForm} />
      
      <main className="flex-1">
        <Hero onFindPlan={handleScrollToForm} />
        <PlanningForm 
          initialPreferences={userPreferences}
          initialOutingData={outingData}
          initialRecommendations={recommendations}
          initialOutingPlans={outingPlans}
          onPreferencesChange={setUserPreferences}
          onOutingDataChange={setOutingData}
          onRecommendationsChange={setRecommendations}
          onOutingPlansChange={setOutingPlans}
        />
        <HowItWorks onStartPlanning={handleScrollToForm} />
        <AboutSection />
      </main>

      <Footer />
    </div>
  );
}
