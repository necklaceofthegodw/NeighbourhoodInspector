# Neighbourhood Inspector - Project Setup & Development Guide

## Project Overview

Pedestrian accessibility analysis web application for Katowice. Built with React + TypeScript, Leaflet maps, OSRM routing, and OpenStreetMap GeoJSON data visualization.

**Completion Status**: Phase 1-2 Complete (MVP with interactive map and service markers)

---

## ✅ Completed Implementation

### Phase 1: Project Setup & Architecture
- [x] React + TypeScript scaffolding with Vite
- [x] Folder structure (components, services, types, utils, data)
- [x] Package dependencies installed (leaflet, axios, types)

### Phase 2: Core Components
- [x] **Map Component** (`src/components/Map.tsx`)
  - Leaflet map centered on Katowice (50.2645°N, 19.0238°E)
  - District boundaries overlaid with color-coding
  - Service markers (shops, pharmacies, restaurants, gyms, schools, libraries)
  - Click handler for point selection
  - Selected point marker with pulsing animation

- [x] **Sidebar Component** (`src/components/Sidebar.tsx`)
  - Displays selected point coordinates
  - Shows accessibility index (services / avg distance)
  - Distance band summaries (5/10/15 min walking time)
  - Category statistics
  - Embedded service list

- [x] **ServiceList Component** (`src/components/ServiceList.tsx`)
  - Filterable by service category
  - Sortable by distance or name
  - Distance and duration badges
  - Visual distance band indicators

### Phase 3: Business Logic
- [x] **OSRM Client** (`src/services/osrm-client.ts`)
  - Public OSRM demo server integration
  - Distance/duration queries for walking routes
  - Caching mechanism
  - Batch processing with rate-limiting

- [x] **Data Loader** (`src/services/data-loader.ts`)
  - GeoJSON parsing and loading
  - Service and district extraction
  - Statistics calculation

- [x] **Accessibility Calculator** (`src/utils/accessibility-calculator.ts`)
  - Index calculation: services_count / avg_distance
  - Distance banding (5/10/15 min)
  - Accessibility level classification

- [x] **Sample Data Generator** (`src/utils/sample-data.ts`)
  - 200 randomized service points
  - 8 Katowice districts

---

## 🔄 Next Steps

### Phase 5: Testing & Refinement
1. Verify OSRM integration and sidebar display
2. Test click handlers and event propagation
3. Mobile responsive adjustments

### Phase 6: Real Data
1. Extract Katowice OSM data via Overpass Turbo
2. Replace sample data with real GeoJSON
3. Validate data quality

### Phase 7: Advanced Features
1. Mobile responsiveness
2. Heatmap layer
3. Export functionality

---

## 🛠️ Development Commands

```bash
npm run dev     # Development server (http://localhost:5173)
npm run build   # Production build
npm run preview # Preview production build
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main orchestration |
| `src/components/Map.tsx` | Leaflet map |
| `src/components/Sidebar.tsx` | Results panel |
| `src/services/osrm-client.ts` | Distance calculations |
| `src/utils/accessibility-calculator.ts` | Index calculations |

---

## 📖 Documentation

See [README.md](../README.md) for complete documentation, API details, and troubleshooting.
