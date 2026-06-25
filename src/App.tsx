import { useState, useEffect } from 'react';
import { Map } from './components/Map';
import { Sidebar } from './components/Sidebar';
import type { Service, District, MapState } from './types';
import { osrmClient } from './services/osrm-client';
import { AccessibilityCalculator } from './utils/accessibility-calculator';
import { generateSampleServices, generateSampleDistricts } from './utils/sample-data';
import './App.css';

function App() {
  const [mapState, setMapState] = useState<MapState>({
    selectedPoint: null,
    selectedServices: [],
    loading: false,
    error: null,
  });

  const [services, setServices] = useState<Service[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [accessibilityIndex, setAccessibilityIndex] = useState(0);
  const [radiusMeters, setRadiusMeters] = useState(1500);
  const [lastEnrichedServices, setLastEnrichedServices] = useState<Service[]>([]);

  // Initialize data
  useEffect(() => {
    const sampleDistricts = generateSampleDistricts();
    setDistricts(sampleDistricts);

    // Load real Katowice services from public/katowice-services.json
    fetch('/katowice-services.json')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json();
      })
      .then((data: Service[]) => {
        setServices(data);
      })
      .catch((error) => {
        console.warn('Could not load real Katowice services, falling back to sample data', error);
        setServices(generateSampleServices(80));
      });
  }, []);

  // Handle point selection
  const filterServicesByRadius = (servicesToFilter: Service[], radius: number) => {
    const withinRadius = servicesToFilter.filter((s) => {
      const distance = s.distance ?? s.straightDistance;
      return distance !== undefined && distance <= radius;
    });

    return withinRadius.sort((a, b) => (a.distance ?? a.straightDistance ?? Infinity) - (b.distance ?? b.straightDistance ?? Infinity));
  };

  const handlePointSelected = async (point: [number, number]) => {
    setMapState((prev) => ({ ...prev, selectedPoint: point, loading: true, error: null }));

    try {
      // Get distances from selected point to all services
      const enrichedServices = await osrmClient.getDistancesToServices(point, services);
      setLastEnrichedServices(enrichedServices);

      const validServices = filterServicesByRadius(enrichedServices, radiusMeters);
      const nearestServices = validServices.slice(0, 30);
      const index = AccessibilityCalculator.calculateIndex(validServices);

      setMapState((prev) => ({
        ...prev,
        selectedServices: nearestServices,
        loading: false,
      }));

      setAccessibilityIndex(index);

      // Update district colors based on accessibility near this point
      const updatedDistricts = districts.map((district) => {
        // In a real app, we'd calculate accessibility for each district center
        const districtCenter = getCenterOfGeometry(district.geometry);
        const districtServices = enrichedServices.filter(
          (s) =>
            s.distance !== undefined &&
            Math.hypot(s.coordinates[0] - districtCenter[0], s.coordinates[1] - districtCenter[1]) < 0.02
        );
        const districtIndex = AccessibilityCalculator.calculateIndex(districtServices);
        const level = AccessibilityCalculator.getAccessibilityLevel(districtIndex);
        const color = AccessibilityCalculator.getAccessibilityColor(level);

        return {
          ...district,
          accessibilityIndex: districtIndex,
          color,
        };
      });

      setDistricts(updatedDistricts);
    } catch (error) {
      console.error('Error calculating distances:', error);
      setMapState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to calculate distances',
      }));
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadiusMeters(newRadius);

    if (!mapState.selectedPoint || lastEnrichedServices.length === 0) {
      return;
    }

    const validServices = filterServicesByRadius(lastEnrichedServices, newRadius);
    const nearestServices = validServices.slice(0, 30);
    const index = AccessibilityCalculator.calculateIndex(validServices);

    setMapState((prev) => ({
      ...prev,
      selectedServices: nearestServices,
    }));
    setAccessibilityIndex(index);
  };

  const handleCloseSidebar = () => {
    setMapState((prev) => ({
      ...prev,
      selectedPoint: null,
      selectedServices: [],
    }));
  };

  return (
    <div className="app">
      <Map
        services={mapState.selectedServices}
        districts={districts}
        onPointSelected={handlePointSelected}
        selectedPoint={mapState.selectedPoint}
        loading={mapState.loading}
      />

      <Sidebar
        selectedPoint={mapState.selectedPoint}
        services={mapState.selectedServices}
        accessibilityIndex={accessibilityIndex}
        radiusMeters={radiusMeters}
        onRadiusChange={handleRadiusChange}
        onClose={handleCloseSidebar}
      />

      {mapState.error && <div className="error-message">{mapState.error}</div>}
    </div>
  );
}

/**
 * Get center point of a geometry
 */
function getCenterOfGeometry(geometry: any): [number, number] {
  if (geometry.type === 'Point') {
    return geometry.coordinates;
  } else if (geometry.type === 'Polygon') {
    const coords = geometry.coordinates[0];
    let sumLon = 0,
      sumLat = 0;
    coords.forEach((coord: [number, number]) => {
      sumLon += coord[0];
      sumLat += coord[1];
    });
    return [sumLon / coords.length, sumLat / coords.length];
  }
  return [19.0238, 50.2645]; // default Katowice center
}

export default App;
