import { useCallback, useState, useEffect } from 'react';
import { Map } from './components/Map';
import { Sidebar } from './components/Sidebar';
import type { Service, District, MapState } from './types';
import { geocodingClient } from './services/geocoding-client';
import { AccessibilityCalculator } from './utils/accessibility-calculator';
import { katowiceDistricts } from './data/katowice-districts';
import { generateSampleServices } from './utils/sample-data';
import './App.css';

const DEFAULT_DISTRICT_COLOR = '#95a5a6';
const WALKING_SPEED_METERS_PER_SECOND = 1.4;
const DEFAULT_ACCESSIBILITY_RADIUS_METERS = 2500;
const DISTRICT_SAMPLE_GRID_SIZE = 7;
const MAX_DISTRICT_SAMPLE_POINTS = 60;

function App() {
  const [mapState, setMapState] = useState<MapState>({
    selectedPoint: null,
    selectedAddress: null,
    selectedServices: [],
    loading: false,
    error: null,
  });

  const [services, setServices] = useState<Service[]>([]);
  const [districts, setDistricts] = useState<District[]>(katowiceDistricts);
  const [accessibilityIndex, setAccessibilityIndex] = useState(0);
  const [radiusMeters, setRadiusMeters] = useState(DEFAULT_ACCESSIBILITY_RADIUS_METERS);
  const [lastEnrichedServices, setLastEnrichedServices] = useState<Service[]>([]);

  // Initialize data
  useEffect(() => {
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

  useEffect(() => {
    setDistricts(colorDistrictsByAccessibility(katowiceDistricts, services, radiusMeters));
  }, [radiusMeters, services]);

  // Handle point selection
  const filterServicesByRadius = useCallback((servicesToFilter: Service[], radius: number) => {
    const withinRadius = servicesToFilter.filter((s) => {
      const distance = s.distance ?? s.straightDistance;
      return distance !== undefined && distance <= radius;
    });

    return withinRadius.sort((a, b) => (a.distance ?? a.straightDistance ?? Infinity) - (b.distance ?? b.straightDistance ?? Infinity));
  }, []);

  const handlePointSelected = useCallback((point: [number, number], addressOverride?: string) => {
    const selectedPointKey = getPointKey(point);

    setMapState((prev) => ({
      ...prev,
      selectedPoint: point,
      selectedAddress: addressOverride || 'Szukam adresu...',
      loading: true,
      error: null,
    }));

    if (!addressOverride) {
      geocodingClient.reverseGeocode(point).then((resolvedAddress) => {
        setMapState((prev) => {
          if (!prev.selectedPoint || getPointKey(prev.selectedPoint) !== selectedPointKey) {
            return prev;
          }

          return {
            ...prev,
            selectedAddress: resolvedAddress || getNearestKnownAddress(point, services),
          };
        });
      });
    }

    try {
      const enrichedServices = enrichServicesWithStraightLineDistances(point, services);
      setLastEnrichedServices(enrichedServices);

      const validServices = filterServicesByRadius(enrichedServices, radiusMeters);
      const index = AccessibilityCalculator.calculateIndex(validServices, radiusMeters);

      setMapState((prev) => ({
        ...prev,
        selectedServices: validServices,
        loading: false,
      }));

      setAccessibilityIndex(index);

    } catch (error) {
      console.error('Error calculating distances:', error);
      setMapState((prev) => ({
        ...prev,
        loading: false,
        error: 'Failed to calculate distances',
      }));
    }
  }, [filterServicesByRadius, radiusMeters, services]);

  const handleAddressSearch = useCallback(async (address: string) => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      return;
    }

    setMapState((prev) => ({
      ...prev,
      selectedAddress: trimmedAddress,
      loading: true,
      error: null,
    }));

    const result = await geocodingClient.searchAddress(trimmedAddress);
    if (!result) {
      setMapState((prev) => ({
        ...prev,
        loading: false,
        error: 'Address not found in Katowice',
      }));
      return;
    }

    handlePointSelected(result.point, result.address);
  }, [handlePointSelected]);

  const handleRadiusChange = (newRadius: number) => {
    setRadiusMeters(newRadius);

    if (!mapState.selectedPoint || lastEnrichedServices.length === 0) {
      return;
    }

    const validServices = filterServicesByRadius(lastEnrichedServices, newRadius);
    const index = AccessibilityCalculator.calculateIndex(validServices, newRadius);

    setMapState((prev) => ({
      ...prev,
      selectedServices: validServices,
    }));
    setAccessibilityIndex(index);
  };

  const handleCloseSidebar = () => {
    setMapState((prev) => ({
      ...prev,
      selectedPoint: null,
      selectedAddress: null,
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
        selectedAddress={mapState.selectedAddress}
        radiusMeters={radiusMeters}
        loading={mapState.loading}
      />

      <Sidebar
        selectedPoint={mapState.selectedPoint}
        selectedAddress={mapState.selectedAddress}
        services={mapState.selectedServices}
        accessibilityIndex={accessibilityIndex}
        radiusMeters={radiusMeters}
        loading={mapState.loading}
        onAddressSearch={handleAddressSearch}
        onRadiusChange={handleRadiusChange}
        onClose={handleCloseSidebar}
      />

      {mapState.error && <div className="error-message">{mapState.error}</div>}
    </div>
  );
}

function colorDistrictsByAccessibility(
  districtsToColor: District[],
  servicesToUse: Service[],
  radiusMeters: number
): District[] {
  if (servicesToUse.length === 0) {
    return districtsToColor.map((district) => ({
      ...district,
      accessibilityIndex: 0,
      color: DEFAULT_DISTRICT_COLOR,
      serviceCount: 0,
      avgDistance: 0,
    }));
  }

  return districtsToColor.map((district) => {
    const samplePoints = getSamplePointsForGeometry(district.geometry);
    const sampleResults = samplePoints.map((point) => calculateAccessibilityAtPoint(point, servicesToUse, radiusMeters));
    const accessibilityIndex = average(sampleResults.map((result) => result.accessibilityIndex));
    const accessibilityLevel = AccessibilityCalculator.getAccessibilityLevel(accessibilityIndex);
    const avgServiceCount = average(sampleResults.map((result) => result.serviceCount));
    const avgDistance = average(sampleResults.map((result) => result.avgDistance).filter((distance) => distance > 0));

    return {
      ...district,
      accessibilityIndex,
      color: AccessibilityCalculator.getAccessibilityColor(accessibilityLevel),
      serviceCount: Math.round(avgServiceCount),
      avgDistance,
    };
  });
}

function calculateAccessibilityAtPoint(
  point: [number, number],
  servicesToUse: Service[],
  radiusMeters: number
): { accessibilityIndex: number; serviceCount: number; avgDistance: number } {
  const nearbyServices = servicesToUse
    .map((service) => {
      const distance = haversineDistance(point, service.coordinates);
      return {
        ...service,
        distance,
        straightDistance: distance,
      };
    })
    .filter((service) => service.distance <= radiusMeters);

  const totalDistance = nearbyServices.reduce((sum, service) => sum + (service.distance ?? 0), 0);

  return {
    accessibilityIndex: AccessibilityCalculator.calculateIndex(nearbyServices, radiusMeters),
    serviceCount: nearbyServices.length,
    avgDistance: nearbyServices.length > 0 ? totalDistance / nearbyServices.length : 0,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getCenterOfGeometry(geometry: District['geometry']): [number, number] {
  if (geometry.type === 'Point') {
    return geometry.coordinates as [number, number];
  }

  const points = getGeometryPoints(geometry);
  if (points.length === 0) {
    return [19.0238, 50.2645];
  }

  const [sumLon, sumLat] = points.reduce(
    ([lonAcc, latAcc], [lon, lat]) => [lonAcc + lon, latAcc + lat],
    [0, 0]
  );

  return [sumLon / points.length, sumLat / points.length];
}

function getGeometryPoints(geometry: District['geometry']): [number, number][] {
  if (geometry.type === 'Polygon') {
    return (geometry.coordinates as [number, number][][]).flat();
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as [number, number][][][]).flat(2);
  }

  return [];
}

function getSamplePointsForGeometry(geometry: District['geometry']): [number, number][] {
  if (geometry.type === 'Point') {
    return [geometry.coordinates as [number, number]];
  }

  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    return [getCenterOfGeometry(geometry)];
  }

  const points = getGeometryPoints(geometry);
  if (points.length === 0) {
    return [getCenterOfGeometry(geometry)];
  }

  const bounds = getBounds(points);
  const lonStep = (bounds.maxLon - bounds.minLon) / DISTRICT_SAMPLE_GRID_SIZE;
  const latStep = (bounds.maxLat - bounds.minLat) / DISTRICT_SAMPLE_GRID_SIZE;
  const samplePoints: [number, number][] = [];

  for (let lonIndex = 0; lonIndex < DISTRICT_SAMPLE_GRID_SIZE; lonIndex += 1) {
    for (let latIndex = 0; latIndex < DISTRICT_SAMPLE_GRID_SIZE; latIndex += 1) {
      const point: [number, number] = [
        bounds.minLon + lonStep * (lonIndex + 0.5),
        bounds.minLat + latStep * (latIndex + 0.5),
      ];

      if (isPointInGeometry(point, geometry)) {
        samplePoints.push(point);
      }
    }
  }

  const center = getCenterOfGeometry(geometry);
  if (isPointInGeometry(center, geometry)) {
    samplePoints.unshift(center);
  }

  const uniquePoints = dedupePoints(samplePoints);
  return uniquePoints.length > 0 ? uniquePoints.slice(0, MAX_DISTRICT_SAMPLE_POINTS) : [center];
}

function getBounds(points: [number, number][]): {
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
} {
  return points.reduce(
    (bounds, [lon, lat]) => ({
      minLon: Math.min(bounds.minLon, lon),
      maxLon: Math.max(bounds.maxLon, lon),
      minLat: Math.min(bounds.minLat, lat),
      maxLat: Math.max(bounds.maxLat, lat),
    }),
    {
      minLon: Infinity,
      maxLon: -Infinity,
      minLat: Infinity,
      maxLat: -Infinity,
    }
  );
}

function isPointInGeometry(point: [number, number], geometry: District['geometry']): boolean {
  if (geometry.type === 'Polygon') {
    return isPointInPolygon(point, geometry.coordinates as [number, number][][]);
  }

  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as [number, number][][][]).some((polygon) => isPointInPolygon(point, polygon));
  }

  return false;
}

function isPointInPolygon(point: [number, number], polygon: [number, number][][]): boolean {
  const [outerRing, ...holes] = polygon;
  if (!outerRing || !isPointInRing(point, outerRing)) {
    return false;
  }

  return !holes.some((hole) => isPointInRing(point, hole));
}

function isPointInRing(point: [number, number], ring: [number, number][]): boolean {
  const [lon, lat] = point;
  let isInside = false;

  for (let currentIndex = 0, previousIndex = ring.length - 1; currentIndex < ring.length; previousIndex = currentIndex++) {
    const [currentLon, currentLat] = ring[currentIndex];
    const [previousLon, previousLat] = ring[previousIndex];
    const crossesLatitude = currentLat > lat !== previousLat > lat;

    if (crossesLatitude) {
      const intersectionLon = ((previousLon - currentLon) * (lat - currentLat)) / (previousLat - currentLat) + currentLon;
      if (lon < intersectionLon) {
        isInside = !isInside;
      }
    }
  }

  return isInside;
}

function dedupePoints(points: [number, number][]): [number, number][] {
  const seen = new Set<string>();
  return points.filter((point) => {
    const key = `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function haversineDistance(from: [number, number], to: [number, number]): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371000 * c;
}

function enrichServicesWithStraightLineDistances(point: [number, number], servicesToUse: Service[]): Service[] {
  return servicesToUse
    .map((service) => {
      const distance = haversineDistance(point, service.coordinates);
      return {
        ...service,
        distance,
        straightDistance: distance,
        duration: distance / WALKING_SPEED_METERS_PER_SECOND,
      };
    })
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
}

function getNearestKnownAddress(point: [number, number], servicesToUse: Service[]): string {
  const nearestService = servicesToUse
    .filter((service) => service.address || service.name)
    .map((service) => ({
      service,
      distance: haversineDistance(point, service.coordinates),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.service;

  return nearestService?.address || nearestService?.name || 'Brak adresu dla tego punktu';
}

function getPointKey(point: [number, number]): string {
  return `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
}

export default App;
