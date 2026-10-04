import React, { useState, useEffect, useRef } from 'react';
import { 
  Zap, 
  Compass, 
  Coffee, 
  Users, 
  Heart, 
  Sparkles, 
  User, 
  HeartHandshake, 
  Home, 
  Calendar as CalendarIcon, 
  MapPin, 
  CheckCircle2, 
  RotateCcw, 
  SlidersHorizontal,
  ArrowRight,
  AlertCircle,
  Loader2,
  Navigation,
  ExternalLink,
  Check,
  Route,
  Clock,
  ChevronRight
} from 'lucide-react';
import { 
  MoodType, 
  GroupType, 
  PlanoraPreferences, 
  PlanningFormState, 
  FormErrors,
  OutingDataResponse,
  RecommendationResponse,
  PlanoraRecommendation,
  OutingPlan,
  OutingPlanStop,
  OutingPlansResponse
} from '../types';
import { fetchOutingData, getRecommendations, getOutingPlans } from '../services';
import { PlanoraMap } from './PlanoraMap';

interface PlanningFormProps {
  initialPreferences?: PlanoraPreferences | null;
  initialOutingData?: OutingDataResponse | null;
  initialRecommendations?: RecommendationResponse | null;
  initialOutingPlans?: OutingPlansResponse | null;
  onPreferencesChange?: (preferences: PlanoraPreferences | null) => void;
  onOutingDataChange?: (data: OutingDataResponse | null) => void;
  onRecommendationsChange?: (recs: RecommendationResponse | null) => void;
  onOutingPlansChange?: (plans: OutingPlansResponse | null) => void;
}

interface LocationSuggestion {
  displayName: string;
  shortName: string;
  latitude: number;
  longitude: number;
}

const MOODS: { id: MoodType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'Bored', label: 'Bored', description: 'Break the routine with something unexpected', icon: Zap },
  { id: 'Adventurous', label: 'Adventurous', description: 'Explore new spots and spontaneous thrills', icon: Compass },
  { id: 'Relaxed', label: 'Relaxed', description: 'Quiet coffee, books, and scenic unwinding', icon: Coffee },
  { id: 'Social', label: 'Social', description: 'Vibrant crowds, meetups, and evening vibes', icon: Users },
  { id: 'Romantic', label: 'Romantic', description: 'Intimate ambiance, dining, and scenic walks', icon: Heart },
  { id: 'Curious', label: 'Curious', description: 'Art galleries, heritage, and quirky discoveries', icon: Sparkles },
];

const GROUPS: { id: GroupType; label: string; description: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'Solo', label: 'Solo', description: 'Independent recharge', icon: User },
  { id: 'Friends', label: 'Friends', description: 'The squad or small crew', icon: Users },
  { id: 'Partner', label: 'Partner', description: 'Quality one-on-one time', icon: HeartHandshake },
  { id: 'Family', label: 'Family', description: 'All ages & shared comfort', icon: Home },
];

const BUDGET_PRESETS = [
  { label: 'Rs 1,500', value: '1500', note: 'Casual coffee / bite' },
  { label: 'Rs 3,500', value: '3500', note: 'Activity & meal' },
  { label: 'Rs 7,000', value: '7000', note: 'Full evening out' },
  { label: 'Rs 15,000', value: '15000', note: 'Special celebration' },
];

const POPULAR_LOCATIONS = [
  { label: 'Clifton, Karachi', full: 'Clifton, Karachi, Sindh, Pakistan', lat: 24.8138, lng: 67.0299 },
  { label: 'Malir, Karachi', full: 'Malir, Karachi, Sindh, Pakistan', lat: 24.8970, lng: 67.2136 },
  { label: 'Gulberg, Lahore', full: 'Gulberg, Lahore, Punjab, Pakistan', lat: 31.5204, lng: 74.3587 },
  { label: 'DHA, Karachi', full: 'DHA Phase 6, Karachi, Sindh, Pakistan', lat: 24.7937, lng: 67.0645 },
  { label: 'DHA, Lahore', full: 'DHA Phase 5, Lahore, Punjab, Pakistan', lat: 31.4697, lng: 74.4084 },
  { label: 'F-7, Islamabad', full: 'Sector F-7, Islamabad, Pakistan', lat: 33.7215, lng: 73.0558 },
];

export const PlanningForm: React.FC<PlanningFormProps> = ({ 
  initialPreferences = null,
  initialOutingData = null,
  initialRecommendations = null,
  initialOutingPlans = null,
  onPreferencesChange,
  onOutingDataChange,
  onRecommendationsChange,
  onOutingPlansChange
}) => {
  // Form input state
  const [formState, setFormState] = useState<PlanningFormState>(() => ({
    mood: initialPreferences?.mood || '',
    budget: initialPreferences ? String(initialPreferences.budget) : '',
    groupType: initialPreferences?.groupType || '',
    location: initialPreferences?.location || '',
    latitude: initialPreferences?.latitude ?? null,
    longitude: initialPreferences?.longitude ?? null,
    date: initialPreferences?.date || new Date().toISOString().split('T')[0],
  }));

  // Structured validated preferences (Source of truth)
  const [submittedPreferences, setSubmittedPreferences] = useState<PlanoraPreferences | null>(
    initialPreferences
  );

  // Normalized real-world data response from services layer
  const [outingData, setOutingData] = useState<OutingDataResponse | null>(
    initialOutingData
  );

  // Gemini-reasoned recommendations from real places (Chunk 4A)
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(
    initialRecommendations
  );

  // Complete multi-stop outing plans (Chunk 4B)
  const [outingPlans, setOutingPlans] = useState<OutingPlansResponse | null>(
    initialOutingPlans
  );
  const [activePlanTab, setActivePlanTab] = useState<number>(0);
  const [activeStopIndex, setActiveStopIndex] = useState<number | null>(null);
  const [showAllPlacesMap, setShowAllPlacesMap] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<1 | 2 | 3>(1);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSearching, setIsSearching] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Finding options that fit your plan...');

  // Location Autocomplete & Geolocation State
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);

  const locationWrapperRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Close suggestions dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (locationWrapperRef.current && !locationWrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Quick date generator
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const isoString = d.toISOString().split('T')[0];
    setFormState(prev => ({ ...prev, date: isoString }));
    if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
  };

  const getNextWeekend = () => {
    const d = new Date();
    const day = d.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + daysUntilSaturday);
    return d.toISOString().split('T')[0];
  };

  // Location search input handler with debouncing
  const handleLocationInputChange = (text: string) => {
    setFormState(prev => ({
      ...prev,
      location: text,
      latitude: null, // Clear anchor until user picks a resolved location or auto-resolved
      longitude: null,
    }));
    setLocationMessage(null);
    if (errors.location) setErrors(prev => ({ ...prev, location: undefined }));

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (text.trim().length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const res = await fetch('/api/location/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: text.trim() }),
        });
        const data = await res.json();
        if (Array.isArray(data.results) && data.results.length > 0) {
          setLocationSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.warn('Failed to search locations:', err);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 280);
  };

  // Select a suggestion
  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    setFormState(prev => ({
      ...prev,
      location: suggestion.shortName || suggestion.displayName,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    }));
    setShowSuggestions(false);
    setLocationMessage(null);
    if (errors.location) setErrors(prev => ({ ...prev, location: undefined }));
  };

  // Select a preset area
  const handleSelectPreset = (preset: typeof POPULAR_LOCATIONS[0]) => {
    setFormState(prev => ({
      ...prev,
      location: preset.label,
      latitude: preset.lat,
      longitude: preset.lng,
    }));
    setShowSuggestions(false);
    setLocationMessage(null);
    if (errors.location) setErrors(prev => ({ ...prev, location: undefined }));
  };

  // Browser Geolocation: "Use my current location"
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetectingLocation(true);
    setLocationMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse-geocode to obtain a useful human-readable location name
          const revRes = await fetch('/api/location/reverse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude, longitude }),
          });

          if (revRes.ok) {
            const data = await revRes.json();
            const locationName = data.shortName || data.displayName || 'Current Location';
            setFormState(prev => ({
              ...prev,
              location: locationName,
              latitude,
              longitude,
            }));
          } else {
            setFormState(prev => ({
              ...prev,
              location: 'Current Location',
              latitude,
              longitude,
            }));
          }

          setShowSuggestions(false);
          if (errors.location) setErrors(prev => ({ ...prev, location: undefined }));
        } catch (err) {
          console.warn('Reverse geocode error:', err);
          setFormState(prev => ({
            ...prev,
            location: 'Current Location',
            latitude,
            longitude,
          }));
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationMessage('Location access was denied. You can search or select your area below.');
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationMessage('Current location is unavailable. Please type your city or area.');
        } else {
          setLocationMessage('Could not retrieve your location. Please enter your area manually.');
        }
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // 1. Mood required
    if (!formState.mood.trim()) {
      newErrors.mood = "Please select what you're in the mood for.";
    }

    // 2. Budget required & positive number
    const cleanedBudget = formState.budget.replace(/[^0-9.]/g, '');
    const numericBudget = Number(cleanedBudget);
    if (!formState.budget.trim()) {
      newErrors.budget = 'Please enter your outing budget in PKR.';
    } else if (isNaN(numericBudget) || numericBudget <= 0) {
      newErrors.budget = 'Budget must be a positive number greater than 0.';
    }

    // 3. Group type required
    if (!formState.groupType.trim()) {
      newErrors.groupType = "Please select who will be joining you.";
    }

    // 4. Location required
    if (!formState.location.trim()) {
      newErrors.location = 'Please enter or select your area.';
    }

    // 5. Date required
    if (!formState.date.trim()) {
      newErrors.date = 'Please pick a date for your outing.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Reset plan stop selection on fresh submission
    setActiveStopIndex(null);
    setActivePlanTab(0);

    let lat = formState.latitude;
    let lng = formState.longitude;
    let locationName = formState.location.trim();

    setIsSearching(true);
    setLoadingStage(1);
    setLoadingMessage('Finding places near you...');

    // If user typed a custom text without selecting a dropdown item, resolve coordinates automatically
    if (lat === null || lng === null) {
      try {
        const resolveRes = await fetch('/api/location/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: locationName }),
        });
        const resolveData = await resolveRes.json();
        if (Array.isArray(resolveData.results) && resolveData.results.length > 0) {
          lat = resolveData.results[0].latitude;
          lng = resolveData.results[0].longitude;
          locationName = resolveData.results[0].shortName || locationName;
        }
      } catch (err) {
        console.warn('Auto location resolution error:', err);
      }
    }

    const numericBudget = Math.round(Number(formState.budget.replace(/[^0-9.]/g, '')));

    const structuredPreferences: PlanoraPreferences = {
      mood: formState.mood,
      budget: numericBudget,
      groupType: formState.groupType,
      location: locationName,
      latitude: lat,
      longitude: lng,
      date: formState.date,
    };

    try {
      // 1. Retrieve authentic real-world places
      setLoadingStage(1);
      setLoadingMessage('Finding places near you...');
      const dataResponse = await fetchOutingData(structuredPreferences);
      setOutingData(dataResponse);

      // 2. Curate recommendations from retrieved items
      let recs: RecommendationResponse;
      if (dataResponse.allNormalizedItems.length > 0) {
        setLoadingStage(2);
        setLoadingMessage('Matching them to your preferences...');
        recs = await getRecommendations(structuredPreferences, dataResponse.allNormalizedItems);
      } else {
        recs = {
          recommendations: [],
          status: 'empty',
          message: 'No local options were found for this location.',
        };
      }
      setRecommendations(recs);

      // 3. Compose Complete Outing Plans
      let plansRes: OutingPlansResponse;
      if (dataResponse.allNormalizedItems.length > 0) {
        setLoadingStage(3);
        setLoadingMessage('Building your outing...');
        plansRes = await getOutingPlans(
          structuredPreferences,
          dataResponse.allNormalizedItems,
          recs.recommendations
        );
      } else {
        plansRes = {
          plans: [],
          status: 'empty',
          message: 'We couldn’t build a complete outing from the available options.',
        };
      }
      setOutingPlans(plansRes);
      setActivePlanTab(0);

      setSubmittedPreferences(structuredPreferences);

      if (onPreferencesChange) {
        onPreferencesChange(structuredPreferences);
      }
      if (onOutingDataChange) {
        onOutingDataChange(dataResponse);
      }
      if (onRecommendationsChange) {
        onRecommendationsChange(recs);
      }
      if (onOutingPlansChange) {
        onOutingPlansChange(plansRes);
      }
    } catch (err) {
      console.error('[PlanningForm] Pipeline error:', err);
      const fallbackRecs: RecommendationResponse = {
        recommendations: [],
        status: 'error',
        message: 'We couldn’t load local options right now. Please try again.',
      };
      const fallbackPlans: OutingPlansResponse = {
        plans: [],
        status: 'error',
        message: 'We couldn’t build a complete outing right now. Please try again.',
      };
      setRecommendations(fallbackRecs);
      setOutingPlans(fallbackPlans);
      setSubmittedPreferences(structuredPreferences);
      if (onRecommendationsChange) {
        onRecommendationsChange(fallbackRecs);
      }
      if (onOutingPlansChange) {
        onOutingPlansChange(fallbackPlans);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleEditPreferences = () => {
    setSubmittedPreferences(null);
  };

  const handleReset = () => {
    const resetState: PlanningFormState = {
      mood: '',
      budget: '',
      groupType: '',
      location: '',
      latitude: null,
      longitude: null,
      date: new Date().toISOString().split('T')[0],
    };
    setFormState(resetState);
    setSubmittedPreferences(null);
    setOutingData(null);
    setRecommendations(null);
    setOutingPlans(null);
    setActivePlanTab(0);
    setErrors({});
    if (onPreferencesChange) {
      onPreferencesChange(null);
    }
    if (onOutingDataChange) {
      onOutingDataChange(null);
    }
    if (onRecommendationsChange) {
      onRecommendationsChange(null);
    }
    if (onOutingPlansChange) {
      onOutingPlansChange(null);
    }
  };

  const formatBudgetDisplay = (val: string | number) => {
    const num = typeof val === 'number' ? val : Number(String(val).replace(/[^0-9]/g, ''));
    if (isNaN(num) || num === 0) return String(val);
    return num.toLocaleString('en-PK');
  };

  return (
    <section id="planning-form" className="py-16 lg:py-24 bg-white border-y border-neutral-200 scroll-mt-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-600 block mb-2">
            Curated Outing Planner
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight font-display text-balance">
            Design your outing in seconds.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-neutral-600 leading-relaxed">
            Fill in your preferences below. We’ll find authentic spots in your exact area matching your vibe and budget.
          </p>
        </div>

        {/* POLISHED LOADING STATE */}
        {isSearching ? (
          <div className="bg-white rounded-2xl p-6 sm:p-8 md:p-10 border border-neutral-200 shadow-sm flex flex-col items-center justify-center text-center animate-in fade-in duration-200 max-w-xl mx-auto my-8 w-full">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center mb-5 text-orange-600 shadow-xs">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 font-display">
              {loadingMessage}
            </h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              Checking genuine spots in {formState.location || 'your area'} that fit your {formState.mood?.toLowerCase() || 'planned'} mood and budget.
            </p>

            {/* 3-Stage Progress Indicator */}
            <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-2 sm:gap-2.5 mt-8 w-full">
              {[
                { stage: 1, label: 'Finding local places' },
                { stage: 2, label: 'Matching vibe & budget' },
                { stage: 3, label: 'Building outing plans' },
              ].map((st) => {
                const isDone = loadingStage > st.stage;
                const isCurrent = loadingStage === st.stage;
                return (
                  <div
                    key={st.stage}
                    className={`flex-1 min-w-0 w-full sm:w-auto sm:min-w-[140px] flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                      isDone
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : isCurrent
                        ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-xs ring-1 ring-orange-500/20'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-400'
                    }`}
                  >
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 text-orange-600 animate-spin shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-neutral-300 inline-block shrink-0" />
                    )}
                    <span className="truncate">{st.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : submittedPreferences ? (
          /* CONFIRMATION STATE WITH RECOMMENDATIONS AND RETRIEVED PLACES */
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
            {/* 1. Preferences Summary Card */}
            <div className="bg-neutral-50 rounded-2xl p-6 sm:p-10 border border-neutral-200 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-neutral-900 font-display">
                      Your preferences are set
                    </h3>
                    <p className="text-sm text-neutral-600 mt-0.5">
                      We’ve curated options in {submittedPreferences.location} tailored to your day.
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleEditPreferences}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-neutral-800 bg-white border border-neutral-300 rounded-xl hover:bg-neutral-50 hover:border-neutral-400 transition-all shadow-xs cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-orange-600" />
                    <span>Edit preferences</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                </div>
              </div>

              {/* Summary Values Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-8">
                {/* Mood */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Mood
                  </div>
                  <div className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                    {submittedPreferences.mood}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {MOODS.find(m => m.id === submittedPreferences.mood)?.description || 'Selected emotional tone'}
                  </div>
                </div>

                {/* Budget */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Budget (PKR)
                  </div>
                  <div className="text-lg font-bold text-neutral-900 tabular-nums font-mono">
                    PKR {formatBudgetDisplay(submittedPreferences.budget)}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Target spend for the day
                  </div>
                </div>

                {/* Group Type */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Who's Joining
                  </div>
                  <div className="text-lg font-bold text-neutral-900">
                    {submittedPreferences.groupType}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    {GROUPS.find(g => g.id === submittedPreferences.groupType)?.description || 'Group configuration'}
                  </div>
                </div>

                {/* Location */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Selected Location
                  </div>
                  <div className="text-lg font-bold text-neutral-900 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="truncate">{submittedPreferences.location}</span>
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Location confirmed</span>
                  </div>
                </div>

                {/* Date */}
                <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs sm:col-span-2 lg:col-span-2">
                  <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">
                    Planned Date
                  </div>
                  <div className="text-lg font-bold text-neutral-900">
                    {new Date(submittedPreferences.date + 'T00:00:00').toLocaleDateString('en-PK', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1">
                    Scheduled day for your outing
                  </div>
                </div>
              </div>
            </div>

            {/* Empty State Banner when no places were found */}
            {outingData && outingData.allNormalizedItems.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 sm:p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-neutral-900 font-display">
                  No local options were found for this location.
                </h4>
                <p className="text-xs sm:text-sm text-neutral-600 max-w-lg mx-auto leading-relaxed">
                  We couldn't retrieve places matching your search in <strong className="text-neutral-800">{submittedPreferences.location}</strong>. Try choosing a recognized area or city from the suggestions or selecting one of the popular presets.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleEditPreferences}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-orange-400" />
                    <span>Change Location or Preferences</span>
                  </button>
                </div>
              </div>
            )}

            {/* Complete Outing Plans */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <Route className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-neutral-900 font-display">
                      Complete Outing Plans
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Cohesive multi-stop itineraries combining verified spots in {submittedPreferences.location} for your <strong className="text-neutral-700">{submittedPreferences.mood}</strong> day.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg w-fit">
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Complete Itineraries • Real Places</span>
                </div>
              </div>

              {outingPlans && outingPlans.status === 'success' && outingPlans.plans.length > 0 ? (
                <div className="space-y-6">
                  {/* Plan Tabs Selector */}
                  <div className="flex flex-wrap gap-2.5 pb-2 border-b border-neutral-100 w-full min-w-0">
                    {outingPlans.plans.map((plan, idx) => {
                      const isActive = (activePlanTab === idx) || (!outingPlans.plans[activePlanTab] && idx === 0);
                      return (
                        <button
                          key={plan.id || idx}
                          type="button"
                          onClick={() => {
                            setActivePlanTab(idx);
                            setActiveStopIndex(null);
                          }}
                          className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer max-w-full min-w-0 ${
                            isActive
                              ? 'bg-neutral-900 text-white shadow-xs'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 hover:text-neutral-900'
                          }`}
                        >
                          <span className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${
                            isActive ? 'bg-orange-500 text-white' : 'bg-neutral-200 text-neutral-800'
                          }`}>
                            {idx + 1}
                          </span>
                          <span className="truncate max-w-[140px] sm:max-w-[200px] md:max-w-[240px]">{plan.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md shrink-0 ${
                            isActive ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-600'
                          }`}>
                            {plan.stops.length} {plan.stops.length === 1 ? 'stop' : 'stops'}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Selected Plan Card */}
                  {(() => {
                    const currentPlan = outingPlans.plans[activePlanTab] || outingPlans.plans[0];
                    if (!currentPlan) return null;

                    return (
                      <div className="bg-neutral-50/70 border border-neutral-200/90 rounded-2xl p-5 sm:p-8 space-y-6 min-w-0">
                        {/* Plan Header & Cost Metas */}
                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 pb-6 border-b border-neutral-200/80 min-w-0">
                          <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">
                                Plan Option {activePlanTab + 1}
                              </span>
                              <span className="text-neutral-300">•</span>
                              <span className="text-xs text-neutral-500">
                                {currentPlan.stops.length} curated {currentPlan.stops.length === 1 ? 'stop' : 'stops'}
                              </span>
                            </div>
                            <h5 className="text-xl sm:text-2xl font-bold text-neutral-900 font-display break-words">
                              {currentPlan.title}
                            </h5>
                            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
                              {currentPlan.description}
                            </p>
                          </div>

                          {/* Budget & Price Tag */}
                          <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs w-full lg:w-auto shrink-0 lg:min-w-[220px]">
                            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-1">
                              Estimated Outing Cost
                            </div>
                            <div className="text-lg font-bold text-neutral-900 tabular-nums">
                              {currentPlan.estimatedTotalCost !== null
                                ? `PKR ${formatBudgetDisplay(currentPlan.estimatedTotalCost)}`
                                : 'Price Varies / Unlisted'}
                            </div>

                            <div className="mt-2">
                              {currentPlan.budgetStatus === 'within_budget' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex-wrap">
                                  <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>Within PKR {formatBudgetDisplay(submittedPreferences.budget)} budget</span>
                                </span>
                              )}
                              {currentPlan.budgetStatus === 'over_budget' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex-wrap">
                                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>Exceeds target spend</span>
                                </span>
                              )}
                              {currentPlan.budgetStatus === 'unknown' && (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded flex-wrap">
                                  <span>Budget flexible • Real-time venue prices</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Interactive Outing Route Map */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-neutral-700 uppercase tracking-wider">
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-600" />
                              <span>Interactive Route Map</span>
                            </div>
                            <span className="text-[11px] font-normal text-neutral-500 lowercase">
                              Click numbered pins or stops below to inspect
                            </span>
                          </div>

                          <PlanoraMap
                            userLocation={
                              submittedPreferences.latitude !== null && submittedPreferences.longitude !== null
                                ? {
                                    latitude: submittedPreferences.latitude,
                                    longitude: submittedPreferences.longitude,
                                    label: submittedPreferences.location,
                                  }
                                : null
                            }
                            selectedPlan={currentPlan}
                            activeStopIndex={activeStopIndex}
                            onSelectStop={(idx) => setActiveStopIndex(idx)}
                            heightClass="h-[360px] sm:h-[420px]"
                          />
                        </div>

                        {/* Stops Timeline */}
                        <div className="space-y-4">
                          <div className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-orange-600" />
                              <span>Itinerary Progression ({currentPlan.stops.length} Stops)</span>
                            </div>
                            {activeStopIndex !== null && (
                              <button
                                type="button"
                                onClick={() => setActiveStopIndex(null)}
                                className="text-[11px] font-medium text-orange-600 hover:text-orange-700 underline cursor-pointer"
                              >
                                View full route bounds
                              </button>
                            )}
                          </div>

                          <div className="space-y-4">
                            {currentPlan.stops.map((stop: OutingPlanStop, stopIdx: number) => {
                              const isLast = stopIdx === currentPlan.stops.length - 1;
                              const place = stop.item;
                              const isSelectedOnMap = activeStopIndex === stopIdx;

                              return (
                                <div key={stop.itemId + '-' + stop.order} className="relative">
                                  <div 
                                    onClick={() => setActiveStopIndex(stopIdx)}
                                    className={`rounded-xl p-5 border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer ${
                                      isSelectedOnMap
                                        ? 'bg-orange-50/50 border-orange-400 ring-2 ring-orange-500/30 shadow-sm'
                                        : 'bg-white border-neutral-200 shadow-xs hover:border-orange-300'
                                    }`}
                                  >
                                    <div className="flex items-start gap-4">
                                      {/* Stop Order Indicator */}
                                      <div className={`w-9 h-9 rounded-xl font-bold text-sm flex items-center justify-center shrink-0 shadow-xs mt-0.5 transition-colors ${
                                        isSelectedOnMap 
                                          ? 'bg-neutral-900 text-white ring-2 ring-orange-400' 
                                          : 'bg-orange-100 text-orange-700'
                                      }`}>
                                        {stop.order}
                                      </div>

                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <h6 className="text-base font-bold text-neutral-900 leading-snug">
                                            {place.name}
                                          </h6>
                                          <span className="text-[11px] font-medium text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded">
                                            {place.category}
                                          </span>
                                          {stop.estimatedCost !== null && (
                                            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                                              PKR {formatBudgetDisplay(stop.estimatedCost)}
                                            </span>
                                          )}
                                          {isSelectedOnMap && (
                                            <span className="text-[10px] font-bold text-orange-700 bg-orange-100 border border-orange-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                              <span className="w-1.5 h-1.5 rounded-full bg-orange-600 animate-pulse"></span>
                                              <span>Active on Map</span>
                                            </span>
                                          )}
                                        </div>

                                        {/* Address */}
                                        <div className="flex items-start gap-1.5 text-xs text-neutral-600">
                                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                                          <span className="leading-relaxed">{place.location}</span>
                                        </div>

                                        {/* Sequence Reason */}
                                        <div className="p-3 rounded-lg bg-orange-50/70 border border-orange-100 text-xs text-neutral-800 leading-relaxed max-w-xl">
                                          <span className="font-semibold text-orange-950">Why this stop in order: </span>
                                          <span>{stop.reason}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action link */}
                                    <div className="sm:self-center shrink-0 pt-2 sm:pt-0 flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => setActiveStopIndex(stopIdx)}
                                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex-1 sm:flex-initial ${
                                          isSelectedOnMap
                                            ? 'bg-neutral-900 text-white shadow-xs'
                                            : 'text-neutral-700 bg-neutral-50 hover:bg-orange-50 hover:text-orange-700 border border-neutral-200'
                                        }`}
                                      >
                                        <Compass className="w-3.5 h-3.5" />
                                        <span>{isSelectedOnMap ? 'Focused' : 'Show on Map'}</span>
                                      </button>

                                      {place.sourceUrl && (
                                        <a
                                          href={place.sourceUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-800 bg-neutral-50 hover:bg-orange-50 hover:text-orange-700 border border-neutral-200 rounded-lg transition-colors cursor-pointer whitespace-nowrap flex-1 sm:flex-initial"
                                        >
                                          <span>Open in Google Maps</span>
                                          <ExternalLink className="w-3 h-3 text-neutral-400" />
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {/* Connector Arrow to next stop */}
                                  {!isLast && (
                                    <div className="flex items-center gap-2 pl-4 py-1.5 text-xs text-neutral-400">
                                      <div className="w-0.5 h-4 bg-orange-300 ml-3" />
                                      <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
                                        <ArrowRight className="w-3 h-3 text-orange-600" />
                                        <span>Next stop: {currentPlan.stops[stopIdx + 1]?.item.name}</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Quick Compare Grid for All Plans */}
                  {outingPlans.plans.length > 1 && (
                    <div className="pt-4 border-t border-neutral-100 w-full min-w-0">
                      <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">
                        Compare All {outingPlans.plans.length} Generated Plans
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full min-w-0">
                        {outingPlans.plans.map((p, pIdx) => (
                          <button
                            key={p.id || pIdx}
                            type="button"
                            onClick={() => {
                              setActivePlanTab(pIdx);
                              setActiveStopIndex(null);
                            }}
                            className={`min-w-0 w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                              activePlanTab === pIdx
                                ? 'border-orange-500 bg-orange-50/40 ring-1 ring-orange-500'
                                : 'border-neutral-200 bg-white hover:border-neutral-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5 gap-2 min-w-0">
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                Option {pIdx + 1}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-medium shrink-0">
                                {p.stops.length} stops
                              </span>
                            </div>
                            <div className="text-xs font-semibold text-neutral-800 truncate mb-1" title={p.title}>
                              {p.title}
                            </div>
                            <div className="text-[11px] text-neutral-500 truncate">
                              {p.estimatedTotalCost !== null
                                ? `PKR ${formatBudgetDisplay(p.estimatedTotalCost)}`
                                : 'Budget flexible'}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Empty or Error state for outing plans */
                <div className="py-8 px-6 rounded-xl border border-dashed border-neutral-200 text-center bg-neutral-50/60">
                  <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
                    {outingPlans?.status === 'error'
                      ? 'Outing plan generator encountered a temporary issue. You can still explore the individual options below.'
                      : 'We couldn’t build a complete outing from the available options. Browse the curated spots below or adjust your area.'}
                  </p>
                </div>
              )}
            </div>

            {/* More Recommended Spots */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg sm:text-xl font-bold text-neutral-900 font-display">
                      More Recommended Spots
                    </h4>
                    <p className="text-xs text-neutral-500">
                      Individual spots in {submittedPreferences.location} tailored to your <strong className="text-neutral-700">{submittedPreferences.mood}</strong> vibe.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-800 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                  <span>Curated for Your Mood</span>
                </div>
              </div>

              {/* Recommendations Cards Grid */}
              {recommendations && recommendations.status === 'success' && recommendations.recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full min-w-0">
                  {recommendations.recommendations.map((rec) => {
                    const place = rec.item;
                    return (
                      <div
                        key={rec.itemId}
                        className="p-5 rounded-xl border border-neutral-200 bg-white hover:border-orange-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4 min-w-0"
                      >
                        <div className="space-y-3">
                          {/* 1. Venue Name */}
                          <div>
                            <h5 className="text-base font-bold text-neutral-900 leading-snug">
                              {place.name}
                            </h5>
                            <div className="mt-1 flex items-center gap-2 text-xs">
                              <span className="font-medium text-neutral-700 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                                {place.category}
                              </span>
                              <span className="text-[11px] font-medium text-neutral-600">
                                {rec.estimatedCost !== null
                                  ? `PKR ${formatBudgetDisplay(rec.estimatedCost)}`
                                  : place.price !== null
                                  ? `PKR ${formatBudgetDisplay(place.price)}`
                                  : 'Price varies / unlisted'}
                              </span>
                            </div>
                          </div>

                          {/* 2. Why this fits (Scannable callout) */}
                          <div className="p-3 rounded-lg bg-orange-50/70 border border-orange-100 text-xs text-neutral-800 leading-relaxed">
                            <span className="font-semibold text-orange-950">Why this fits: </span>
                            <span>{rec.reason}</span>
                          </div>

                          {/* 3. Address */}
                          <div className="flex items-start gap-1.5 text-xs text-neutral-600">
                            <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                            <span className="leading-relaxed line-clamp-2">{place.location}</span>
                          </div>
                        </div>

                        {/* 4. Footer: Subtle Match Score & Google Maps Action */}
                        <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] font-medium text-neutral-400">
                            {rec.suitabilityScore}% vibe match
                          </span>
                          {place.sourceUrl && (
                            <a
                              href={place.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                            >
                              <span>Open in Google Maps</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty or Error State */
                <div className="py-12 px-6 rounded-xl border border-dashed border-neutral-200 text-center bg-neutral-50/60">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-neutral-900 mb-1">
                    {recommendations?.status === 'error'
                      ? 'We couldn’t load recommendations right now.'
                      : 'No strong matches found from the available local options.'}
                  </h4>
                  <p className="text-xs text-neutral-500 max-w-md mx-auto mb-4 leading-relaxed">
                    {recommendations?.status === 'error'
                      ? 'Please try refreshing your search or selecting an adjacent neighborhood.'
                      : 'We couldn’t find high-confidence matches in the retrieved places for this specific mood. Try adjusting your mood or selecting an adjacent neighborhood.'}
                  </p>
                  <button
                    type="button"
                    onClick={handleEditPreferences}
                    className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    Adjust Preferences
                  </button>
                </div>
              )}
            </div>

            {/* All Discovered Places Reference */}
            {outingData && outingData.placesResult.data.length > 0 && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-neutral-200 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-600 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-neutral-900 font-display">
                        All Places Found in {submittedPreferences.location} ({outingData.placesResult.data.length})
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Real-world spots retrieved in your selected area.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAllPlacesMap(!showAllPlacesMap)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Compass className="w-3.5 h-3.5 text-orange-600" />
                      <span>{showAllPlacesMap ? 'Hide Area Map' : 'View All on Map'}</span>
                    </button>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg w-fit">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Google Maps Verified</span>
                    </div>
                  </div>
                </div>

                {/* Optional Area Map of all places */}
                {showAllPlacesMap && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <PlanoraMap
                      userLocation={
                        submittedPreferences.latitude !== null && submittedPreferences.longitude !== null
                          ? {
                              latitude: submittedPreferences.latitude,
                              longitude: submittedPreferences.longitude,
                              label: submittedPreferences.location,
                            }
                          : null
                      }
                      items={outingData.allNormalizedItems}
                      heightClass="h-[340px] sm:h-[400px]"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {outingData.placesResult.data.map((place) => (
                    <div
                      key={place.id}
                      className="p-5 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h5 className="text-base font-bold text-neutral-900 leading-snug">
                            {place.name}
                          </h5>
                          <span className="text-[11px] font-medium text-neutral-600 bg-white border border-neutral-200 px-2 py-0.5 rounded shrink-0">
                            {place.category}
                          </span>
                        </div>
                        <div className="flex items-start gap-1.5 text-xs text-neutral-600">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{place.location}</span>
                        </div>
                        {place.description && (
                          <p className="text-xs text-neutral-500 line-clamp-2 pt-1">
                            {place.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs">
                        <span className="text-[11px] font-medium text-neutral-500">
                          Source: Google Maps
                        </span>
                        {place.sourceUrl && (
                          <a
                            href={place.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-orange-600 hover:text-orange-700 hover:underline"
                          >
                            <span>Open in Google Maps</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* THE FORM */
          <form onSubmit={handleSubmit} noValidate className="space-y-10">
            {/* 1. Mood */}
            <div className="bg-neutral-50/70 rounded-2xl p-6 sm:p-8 border border-neutral-200/90">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 font-display flex items-center gap-2">
                    <span>1. What are you in the mood for?</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                    Select the emotional tone of your planned day or night.
                  </p>
                </div>
                <span className="text-xs font-medium text-orange-700">Required</span>
              </div>

              {errors.mood && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-3 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.mood}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {MOODS.map(m => {
                  const Icon = m.icon;
                  const isSelected = formState.mood === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setFormState(prev => ({ ...prev, mood: m.id }));
                        if (errors.mood) setErrors(prev => ({ ...prev, mood: undefined }));
                      }}
                      className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-white ring-2 ring-orange-500/20 shadow-sm'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-orange-600 text-white' : 'bg-neutral-100 text-neutral-700'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <div className="w-2 h-2 rounded-full bg-orange-600" />
                        )}
                      </div>
                      <div className="font-semibold text-sm text-neutral-900">{m.label}</div>
                      <div className="text-[11px] text-neutral-500 leading-tight mt-0.5">{m.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Budget (PKR) */}
            <div className="bg-neutral-50/70 rounded-2xl p-6 sm:p-8 border border-neutral-200/90">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 font-display flex items-center gap-2">
                    <span>2. Outing Budget (PKR)</span>
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                    Enter the total amount in Pakistani Rupees you want to allocate.
                  </p>
                </div>
                <span className="text-xs font-medium text-orange-700">Required</span>
              </div>

              {errors.budget && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-3 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.budget}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 font-semibold text-xs tracking-wider">
                    PKR
                  </div>
                  <input
                    type="number"
                    min="1"
                    step="100"
                    value={formState.budget}
                    onChange={(e) => {
                      setFormState(prev => ({ ...prev, budget: e.target.value }));
                      if (errors.budget) setErrors(prev => ({ ...prev, budget: undefined }));
                    }}
                    placeholder="e.g. 4500"
                    className={`block w-full pl-13 pr-4 py-3 bg-white text-neutral-900 border rounded-xl text-base font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors ${
                      errors.budget ? 'border-red-400' : 'border-neutral-300'
                    }`}
                  />
                  {formState.budget && (
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-xs text-neutral-500 tabular-nums">
                      Rs {formatBudgetDisplay(formState.budget)}
                    </div>
                  )}
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-neutral-500 font-medium mr-1">Quick pick:</span>
                  {BUDGET_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => {
                        setFormState(prev => ({ ...prev, budget: preset.value }));
                        if (errors.budget) setErrors(prev => ({ ...prev, budget: undefined }));
                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors cursor-pointer ${
                        formState.budget === preset.value
                          ? 'border-orange-500 bg-orange-50 text-orange-900 font-semibold'
                          : 'border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. Who's joining */}
            <div className="bg-neutral-50/70 rounded-2xl p-6 sm:p-8 border border-neutral-200/90">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 font-display">
                    3. Who's joining?
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                    Helps filter group-friendly activities or intimate spots.
                  </p>
                </div>
                <span className="text-xs font-medium text-orange-700">Required</span>
              </div>

              {errors.groupType && (
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-3 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errors.groupType}</span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {GROUPS.map(g => {
                  const Icon = g.icon;
                  const isSelected = formState.groupType === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setFormState(prev => ({ ...prev, groupType: g.id }));
                        if (errors.groupType) setErrors(prev => ({ ...prev, groupType: undefined }));
                      }}
                      className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-orange-500 bg-white ring-2 ring-orange-500/20 shadow-sm'
                          : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg mb-2 flex items-center justify-center ${
                        isSelected ? 'bg-orange-600 text-white' : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="font-semibold text-sm text-neutral-900">{g.label}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 leading-tight">{g.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4 & 5. Location & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Location Input with Autocomplete & Geolocation */}
              <div 
                ref={locationWrapperRef}
                className="bg-neutral-50/70 rounded-2xl p-6 sm:p-8 border border-neutral-200/90 flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 font-display">
                        4. Location
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Choose your area or use your device's location.
                      </p>
                    </div>
                    <span className="text-xs font-medium text-orange-700">Required</span>
                  </div>

                  {/* "Use my current location" button */}
                  <div className="my-3">
                    <button
                      type="button"
                      onClick={handleUseCurrentLocation}
                      disabled={isDetectingLocation}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100/80 border border-orange-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isDetectingLocation ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Detecting location...</span>
                        </>
                      ) : (
                        <>
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Use my current location</span>
                        </>
                      )}
                    </button>
                  </div>

                  {locationMessage && (
                    <div className="text-xs text-neutral-600 bg-neutral-100 p-2.5 rounded-lg border border-neutral-200 mb-3">
                      {locationMessage}
                    </div>
                  )}

                  {errors.location && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-3 bg-red-50 p-2.5 rounded-lg border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.location}</span>
                    </div>
                  )}

                  {/* Search Input */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={formState.location}
                      onChange={(e) => handleLocationInputChange(e.target.value)}
                      onFocus={() => {
                        if (locationSuggestions.length > 0) setShowSuggestions(true);
                      }}
                      placeholder="Type an area (e.g. Malir, Clifton, Gulberg)"
                      autoComplete="off"
                      className={`block w-full pl-10 pr-9 py-3 bg-white text-neutral-900 border rounded-xl text-sm font-medium placeholder:text-neutral-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors ${
                        errors.location ? 'border-red-400' : 'border-neutral-300'
                      }`}
                    />
                    {isSearchingLocation && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-neutral-400">
                        <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                      </div>
                    )}

                    {/* Suggestions Dropdown */}
                    {showSuggestions && locationSuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 rounded-xl shadow-lg z-30 max-h-56 overflow-y-auto divide-y divide-neutral-100">
                        {locationSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectSuggestion(suggestion)}
                            className="w-full text-left px-3.5 py-2.5 hover:bg-orange-50/60 transition-colors cursor-pointer flex items-start gap-2.5"
                          >
                            <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-neutral-900 truncate">
                                {suggestion.shortName || suggestion.displayName}
                              </div>
                              <div className="text-[11px] text-neutral-500 truncate">
                                {suggestion.displayName}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Geographic Resolution Status Indicator */}
                    {formState.latitude !== null && formState.longitude !== null && !isSearchingLocation && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 mt-1.5 font-medium">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Location confirmed</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Popular Presets */}
                <div className="pt-4">
                  <div className="text-[11px] text-neutral-500 font-medium mb-1.5">Common areas:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {POPULAR_LOCATIONS.map((loc) => (
                      <button
                        key={loc.label}
                        type="button"
                        onClick={() => handleSelectPreset(loc)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                          formState.location === loc.label
                            ? 'bg-orange-50 border-orange-300 text-orange-900 font-medium'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:border-neutral-300'
                        }`}
                      >
                        {loc.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Date Input */}
              <div className="bg-neutral-50/70 rounded-2xl p-6 sm:p-8 border border-neutral-200/90 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-neutral-900 font-display">
                        5. Date
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        When are you stepping out?
                      </p>
                    </div>
                    <span className="text-xs font-medium text-orange-700">Required</span>
                  </div>

                  {errors.date && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium mb-3 bg-red-50 p-2.5 rounded-lg border border-red-200">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.date}</span>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <CalendarIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="date"
                      value={formState.date}
                      onChange={(e) => {
                        setFormState(prev => ({ ...prev, date: e.target.value }));
                        if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                      }}
                      className={`block w-full pl-10 pr-4 py-3 bg-white text-neutral-900 border rounded-xl text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-colors ${
                        errors.date ? 'border-red-400' : 'border-neutral-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Quick Date Presets */}
                <div className="pt-4">
                  <div className="text-[11px] text-neutral-500 font-medium mb-1.5">Quick date:</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickDate(0)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300 transition-colors cursor-pointer"
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDate(1)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300 transition-colors cursor-pointer"
                    >
                      Tomorrow
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const weekend = getNextWeekend();
                        setFormState(prev => ({ ...prev, date: weekend }));
                        if (errors.date) setErrors(prev => ({ ...prev, date: undefined }));
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:border-neutral-300 transition-colors cursor-pointer"
                    >
                      This Saturday
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Primary Action */}
            <div className="flex items-center justify-end pt-4 border-t border-neutral-200">
              <button
                type="submit"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-sm font-semibold tracking-wide text-white bg-orange-600 hover:bg-orange-500 active:bg-orange-700 rounded-xl transition-all shadow-md shadow-orange-600/25 hover:shadow-lg hover:shadow-orange-600/30 active:scale-[0.99] cursor-pointer"
              >
                <span>Discover Plans</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};
