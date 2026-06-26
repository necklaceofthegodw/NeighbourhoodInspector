# Neighbourhood Inspector - Pedestrian Accessibility Analysis

A React + TypeScript web application for analyzing pedestrian accessibility of services in Katowice, Poland. Users can click on any location on the map to see nearby services (shops, pharmacies, restaurants, gyms, schools, libraries) with walking distances calculated using OSRM (Open Source Routing Machine).

## Features

✅ **Interactive Leaflet Map**
- Centered on Katowice with zoom level 12
- OpenStreetMap basemap
- Katowice districts displayed as overlays with color-coded accessibility indices

✅ **Service Layer Visualization**
- 200+ sample service points with categories (shops, pharmacies, restaurants, gyms, schools, libraries)
- Clustered markers with category-specific colors
- Hover popups showing service names and categories

✅ **Click-to-Analyze**
- Click any location on the map to select a point
- Green pulsing marker indicates selected point

✅ **Accessibility Analysis** (in development)
- OSRM integration for network-based walking distance calculation
- Accessibility Index = Walk Score-like category weights + gravity-style distance decay, normalized to 0-100
- Distance bands: 5 min, 10 min, 15 min, and beyond
- Right sidebar displaying:
  - Selected location coordinates
  - Accessibility score and level (good/medium/bad)
  - Services grouped by walking time
  - Filterable service list with sorting options

✅ **District Boundaries**
- 8 Katowice districts displayed with boundaries
- Color-coded by accessibility index
- Interactive popups showing district names

## Architecture

### Folder Structure

```
src/
├── components/
│   ├── Map.tsx              # Leaflet map component
│   ├── Map.css              # Map styling
│   ├── Sidebar.tsx          # Results sidebar
│   ├── Sidebar.css          # Sidebar styling
│   ├── ServiceList.tsx      # Services list component
│   └── ServiceList.css      # Services list styling
├── services/
│   ├── osrm-client.ts       # OSRM API wrapper
│   └── data-loader.ts       # GeoJSON loading utilities
├── types/
│   └── index.ts             # TypeScript interfaces
├── utils/
│   ├── accessibility-calculator.ts  # Index calculation logic
│   └── sample-data.ts       # Sample data generator
├── App.tsx                  # Main app component
├── App.css                  # App styling
├── main.tsx                 # Entry point
└── index.css                # Global styles
```

### Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Leaflet** - Interactive mapping
- **Axios** - HTTP client
- **OSRM** - Walking distance calculation (public demo server)

## Setup & Development

### Installation

```bash
# Navigate to project directory
cd NeighbourhoodInspector

# Install dependencies
npm install
```

### Running Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173/`

### Building for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## Usage

1. **View the Map**
   - The map loads showing Katowice with districts and services
   - Zoom and pan using map controls or scroll

2. **Select a Location**
   - Click anywhere on the map to select a point
   - A green pulsing marker appears at the clicked location

3. **View Analysis**
   - The sidebar appears on the right side with:
     - Clicked point coordinates
     - Accessibility Index (services / avg distance)
     - Services grouped by walking time
     - Full service list with distances

4. **Filter & Sort**
   - Use dropdown filters to show only specific service categories
   - Sort services by distance or name

## Data Management

### OpenStreetMap Data

The app loads real service POIs from `public/katowice-services.json`. Refresh this file from Overpass / OpenStreetMap with:

```bash
npm run fetch:services
```

The script queries shops, pharmacies, restaurants, gyms, schools, and libraries within Katowice, then writes them in the `Service[]` shape used by the app.

District boundaries can be refreshed separately with:

```bash
npm run fetch:districts
```

## API & Services

### OSRM (Walking Distance)

- **Endpoint**: `https://router.project-osrm.org/route/v1/foot/`
- **Usage**: Network-based pedestrian routing
- **Rate Limits**: Public demo server has casual limits
- **Fallback**: Haversine formula (straight-line distance) if OSRM fails

**Note**: For production use, consider self-hosting OSRM or using alternative services like GraphHopper.

## Performance Considerations

- **Data Loading**: Currently 200 services; optimize GeoJSON with simplification for 1000+
- **Distance Queries**: Batched with 100ms delays to avoid rate limiting
- **Caching**: OSRM results cached by point-to-point pair
- **Lazy Loading**: Districts and services loaded on initialization

## Known Issues & TODOs

### Current State

- ✅ Map displays correctly with districts and services
- ✅ Click handler working (selected point marker appears)
- ⚠️ Sidebar display may need refinement for edge cases
- ⚠️ Build process may have CSS minification warnings (non-blocking)

### Future Enhancements

1. **Mobile Responsive**
   - Sidebar should stack below map on small screens
   - Touch-friendly controls

2. **Advanced Filtering**
   - Filter by service type
   - Filter by distance bands
   - Custom radius search

3. **Export Features**
   - Export accessibility index as CSV/GeoJSON
   - Generate accessibility report PDFs

4. **Data Management**
   - Admin interface to update POI data
   - Periodic OSM data refresh
   - Data validation & quality checks

5. **Analysis Tools**
   - Heatmap layer for accessibility
   - Comparison between districts
   - Demographic overlay

6. **Accessibility**
   - Keyboard navigation (arrow keys, Enter/Escape)
   - Screen reader support (ARIA labels)
   - High contrast mode

## Research Context

This tool supports analysis for the research paper:
**"Influence of Street Structure and Building Development on Pedestrian Accessibility of Services"**

**Key Research Questions**:
- How does urban layout affect pedestrian accessibility?
- Can two districts with similar population have very different accessibility due to urban design?
- What's the relationship between street network density and service availability?

## Development Notes

### TypeScript Configuration

The project uses `verbatimModuleSyntax` which requires explicit `type` imports:

```typescript
// ✅ Correct
import type { Service, District } from '../types';

// ❌ Incorrect
import { Service, District } from '../types';
```

### Adding New Service Categories

1. Update the `ServiceCategory` type in `src/types/index.ts`
2. Add category icon in `src/components/ServiceList.tsx`
3. Add sample data generation in `src/utils/sample-data.ts`

## Troubleshooting

### Map not loading
- Check browser console for errors
- Verify Leaflet CSS is imported in `Map.tsx`
- Ensure OpenStreetMap tiles are accessible

### Sidebar not appearing after click
- Check browser Network tab for OSRM request status
- Verify OSRM service is reachable (currently using public demo)
- Check Application console for JavaScript errors

### Services not showing
- Verify GeoJSON is properly formatted
- Check that coordinates are [lon, lat] not [lat, lon]
- Ensure categories match defined ServiceCategory types

## License

[Add your license here]

## Contributing

[Add contribution guidelines here]
