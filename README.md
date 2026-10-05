# Planora — Local Outing Planner

Planora is an easy-to-use web application that helps you plan unforgettable days out. Instead of spending hours in group chats debating where to go, Planora curates ready-to-go outing itineraries based on your **mood**, your **budget in PKR (Pakistani Rupees)**, your **location**, and **who is joining you**.

---

## 1. What Problem Does Planora Solve?

Deciding where to go and what to do in a city can be frustrating:
- Group chats often end in indecision and going to the exact same spots.
- Searching online returns random, disconnected restaurant links rather than cohesive day plans.
- Many travel apps suggest unrealistic prices in foreign currencies.

**Planora solves this** by combining verified real-world places from Google Places with Gemini AI to build practical, multi-stop outing plans in your chosen area, fully aligned with your budget in PKR.

---

## 2. Main Features

- **Mood-Based Planning**: Choose from 6 curated outing moods:
  - *Relaxed & Cozy* (peaceful cafes, scenic pauses)
  - *Foodie Adventure* (local delicacies, top bites)
  - *Active & Outdoors* (parks, walks, outdoor spots)
  - *Cultural & Artsy* (galleries, heritage, bookstores)
  - *Lively Night Out* (evening energy, buzzing spots)
  - *Romantic* (charming ambiance, intimate spots)
- **PKR Budget Control**: Enter any target budget in PKR or choose from quick presets (e.g., Rs 1,500, Rs 3,500, Rs 7,500, Rs 15,000).
- **Group-Tailored Recommendations**: Filter activities whether you are going solo, as a couple, with friends, or with family.
- **Smart Location Selector**: Type any neighborhood or city, select from popular presets, or click "Use my current location".
- **Complete Multi-Stop Outing Plans**: Generates cohesive 2-to-4 stop itineraries (Stop 1, Stop 2, Stop 3) with estimated costs and reasons why each stop belongs in sequence.
- **Interactive Route Map**: Explore your outing stops on a clean, interactive Leaflet map with numbered pins and route bounds.
- **Direct Venue Navigation**: View addresses and open each place directly in Google Maps for turn-by-turn directions.
- **More Curated Spots**: Browse additional individual venues tailored to your vibe.

---

## 3. How the User Flow Works

1. **Select Preferences**:
   - Choose your **Mood**.
   - Set your **Outing Budget (PKR)**.
   - Select **Who's joining** (Solo, Couple, Friends, Family).
   - Enter your **Location** or use current device location.
   - Pick your **Date** (Today, Tomorrow, This Saturday, or custom).
2. **Generate Plans**:
   - Click **Discover Plans**.
   - Planora validates your inputs, queries Google Places for authentic venues in that area, and uses Gemini to build tailored itineraries.
3. **Review & Enjoy**:
   - Browse the **Complete Outing Plans** and switch between plan options.
   - Inspect stops, timing reasons, and cost breakdowns.
   - Use the **Interactive Route Map** to see how the stops connect.
   - Click **Open in Google Maps** on any stop when you are ready to head out.
   - Click **Edit preferences** at any time to adjust your mood, budget, or area.

---

## 4. How Google Places and Gemini AI Are Used

Planora uses two AI and data services working in harmony:

1. **Google Maps Platform (Places & Geocoding APIs)**:
   - **Geocoding**: Translates typed area names or device coordinates into precise geographic coordinates.
   - **Places Search**: Retrieves verified, real-world venues (cafes, restaurants, parks, cultural sites) in your exact area.
   - *Planora never invents fake places*—it only works with authentic places retrieved directly from Google.

2. **Google Gemini AI (`gemini-2.5-flash`)**:
   - **Smart Curation**: Analyzes the verified places and selects those that best fit your mood and group.
   - **Sequencing & Cost Estimation**: Organizes the places into a logical sequence (e.g., afternoon coffee followed by an evening walk and dinner), calculates estimated costs in PKR, and ensures the total plan stays within your target spend.

---

## 5. Simple Architecture Overview

Planora is built as a modern **full-stack web application**:

```
[ User Browser (React + Tailwind + Leaflet) ]
                     │
                     ▼ HTTP / JSON
[ Backend API (Express.js on Node.js / Vercel Serverless) ]
        │                                  │
        ▼                                  ▼
[ Google Maps / Places API ]       [ Google Gemini AI ]
(Finds real local places)          (Curates & sequences plans)
```

- **Frontend (Client)**:
  - Built with **React 19**, **TypeScript**, **Vite**, and **Tailwind CSS**.
  - Renders the interactive planner form, animated loading states, map views, and itinerary cards.
  - Fully responsive on desktop, tablet, and mobile devices.

- **Backend (Server)**:
  - Built with **Express** running on Node.js.
  - Serves as a secure proxy for API calls so your secret keys (`GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`) stay safely on the server and are never exposed in the user's browser.
  - Runs with Vite middleware in local development and as a serverless function (`/api`) on Vercel in production.

---

## 6. Project Structure

```
├── api/
│   └── index.ts                 # Vercel serverless function entry point
├── server/
│   └── app.ts                   # Express server with all /api routes
├── src/
│   ├── assets/images/           # Editorial images used in the landing page
│   ├── components/
│   │   ├── AboutSection.tsx     # Philosophy & background information
│   │   ├── Footer.tsx           # Footer with copyright and credits
│   │   ├── Hero.tsx             # Main hero section with call-to-action
│   │   ├── HowItWorks.tsx       # 3-step explanation of the platform
│   │   ├── Navbar.tsx           # Top navigation bar with logo
│   │   ├── PlanningForm.tsx     # Main planner form, loading state & plans
│   │   └── PlanoraMap.tsx       # Leaflet interactive map component
│   ├── services/
│   │   ├── outingDataService.ts # Calls backend for places
│   │   ├── outingPlanService.ts # Calls backend for multi-stop plans
│   │   └── placesService.ts     # Calls backend for location search
│   ├── types.ts                 # TypeScript interfaces and types
│   ├── App.tsx                  # Main React application component
│   ├── main.tsx                 # React DOM mount point
│   └── index.css                # Global Tailwind CSS styles
├── public/
│   └── favicon.svg              # Browser tab icon (Planora compass logo)
├── index.html                   # HTML page template
├── metadata.json                # Project metadata
├── package.json                 # Node.js dependencies and scripts
├── server.ts                    # Local development server entry point
├── tsconfig.json                # TypeScript compiler configuration
├── vercel.json                  # Vercel deployment and routing rules
└── vite.config.ts               # Vite bundler configuration
```

---

## 7. Required Environment Variables

To run the application, create a `.env` file in the project root (see `.env.example`):

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | **Yes** | Google Gemini API key used by the backend to curate and sequence outing plans. |
| `GOOGLE_MAPS_API_KEY` | **Yes** | Google Maps Platform API key used for Geocoding and Google Places search. |
| `VITE_GOOGLE_MAPS_API_KEY` | Optional | Fallback Google Maps key. |
| `APP_URL` | Optional | The base URL where the application is deployed. |

---

## 8. How to Install and Run Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or newer)
- npm (comes with Node.js)

### Steps

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure your environment**:
   Create a `.env` file in the root directory by copying the example:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and add your `GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY`.

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **View the app**:
   Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## 9. How to Build and Check the Code

- **Check TypeScript types and lint**:
  ```bash
  npm run lint
  ```
- **Build production bundle**:
  ```bash
  npm run build
  ```
  The compiled frontend assets will be placed in the `dist/` directory.

---

## 10. Deployment (GitHub & Vercel)

### GitHub
- Push the codebase to your GitHub repository.
- Your `.env` file is excluded via `.gitignore` to protect your secret keys.

### Vercel Deployment
Planora is configured out-of-the-box for seamless Vercel deployment:
1. Import your GitHub repository into [Vercel](https://vercel.com).
2. Under **Project Settings** → **Environment Variables**, add:
   - `GEMINI_API_KEY`
   - `GOOGLE_MAPS_API_KEY`
3. Click **Deploy**.
4. Vercel automatically:
   - Builds the frontend via `vite build`.
   - Routes all `/api/*` requests through `vercel.json` to the serverless function in `api/index.ts`.

---

## 11. Security Notes & Limitations

- **API Key Security**: Sensitive keys (`GEMINI_API_KEY` and `GOOGLE_MAPS_API_KEY`) are stored and used **only on the backend server**. They are never exposed in client-side JavaScript.
- **Real-World Places**: Planora only suggests genuine venues returned by Google Places for your selected area. In smaller or less mapped areas, fewer venues may be available; try selecting a broader district or major nearby neighborhood if needed.
- **Price Estimates**: All PKR costs are calculated estimates designed to keep your outing aligned with your budget. Venue prices and menu costs may change over time.

---

## 12. Credits

**Planora**
© 2026 Planora. All rights reserved.
Made by Saim Zaidi
