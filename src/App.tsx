import { useCallback, useEffect, useMemo, useState } from 'react';
import { Map } from './components/Map';
import { MobileSearch } from './components/MobileSearch';
import { Sidebar } from './components/Sidebar';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import type { Service, District, MapState } from './types';
import { geocodingClient } from './services/geocoding-client';
import { AccessibilityCalculator } from './utils/accessibility-calculator';
import { katowiceDistricts } from './data/katowice-districts';
import { generateSampleServices } from './utils/sample-data';
import { getTranslations, type Language } from './i18n';
import {
  createServiceSpatialIndex,
  haversineDistance,
  queryServicesWithinRadius,
  type ServiceSpatialIndex,
} from './utils/service-spatial-index';
import './App.css';

const DEFAULT_DISTRICT_COLOR = '#95a5a6';
const WALKING_SPEED_METERS_PER_SECOND = 1.4;
const DEFAULT_ACCESSIBILITY_RADIUS_METERS = 2500;
const MAX_ACCESSIBILITY_RADIUS_METERS = 2500;
const DISTRICT_COLORING_DEBOUNCE_MS = 180;
const DISTRICT_SAMPLE_GRID_SIZE = 7;
const MAX_DISTRICT_SAMPLE_POINTS = 60;
const LANGUAGE_STORAGE_KEY = 'neighbourhood-inspector-language';
const DISTRICT_SAMPLE_POINTS = katowiceDistricts.map((district) => ({
  id: district.id,
  points: getSamplePointsForGeometry(district.geometry),
}));

function App() {
  const [language, setLanguage] = useState<Language>(() => getInitialLanguage());
  const t = getTranslations(language);

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
  const serviceIndex = useMemo(() => createServiceSpatialIndex(services), [services]);

  useEffect(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    document.documentElement.lang = language;
    document.title = t.appTitle;
  }, [language, t.appTitle]);

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
    const timeoutId = window.setTimeout(() => {
      setDistricts(colorDistrictsByAccessibility(katowiceDistricts, serviceIndex, radiusMeters));
    }, DISTRICT_COLORING_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [radiusMeters, serviceIndex]);

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
      selectedAddress: addressOverride || t.loadingAddress,
      loading: true,
      error: null,
    }));

    if (!addressOverride) {
      geocodingClient.reverseGeocode(point, language).then((resolvedAddress) => {
        setMapState((prev) => {
          if (!prev.selectedPoint || getPointKey(prev.selectedPoint) !== selectedPointKey) {
            return prev;
          }

          return {
            ...prev,
            selectedAddress: resolvedAddress || getNearestKnownAddress(point, services, t.fallbackAddress),
          };
        });
      });
    }

    try {
      const candidateServices = queryServicesWithinRadius(serviceIndex, point, MAX_ACCESSIBILITY_RADIUS_METERS);
      const enrichedServices = enrichServicesWithStraightLineDistances(point, candidateServices);
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
        error: t.distanceCalculationError,
      }));
    }
  }, [
    filterServicesByRadius,
    language,
    radiusMeters,
    serviceIndex,
    services,
    t.distanceCalculationError,
    t.fallbackAddress,
    t.loadingAddress,
  ]);

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

    const result = await geocodingClient.searchAddress(trimmedAddress, language);
    if (!result) {
      setMapState((prev) => ({
        ...prev,
        loading: false,
        error: t.addressNotFound,
      }));
      return;
    }

    handlePointSelected(result.point, result.address);
  }, [handlePointSelected, language, t.addressNotFound]);

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
        language={language}
        labels={t}
      />

      <LanguageSwitcher
        language={language}
        labels={t}
        onLanguageChange={setLanguage}
      />

      <MobileSearch
        selectedAddress={mapState.selectedAddress}
        loading={mapState.loading}
        onAddressSearch={handleAddressSearch}
        labels={t}
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
        labels={t}
      />

      {mapState.error && <div className="error-message">{mapState.error}</div>}
    </div>
  );
}

function getInitialLanguage(): Language {
  const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (storedLanguage === 'pl' || storedLanguage === 'en') {
    return storedLanguage;
  }

  return 'pl';
}

function colorDistrictsByAccessibility(
  districtsToColor: District[],
  serviceIndex: ServiceSpatialIndex,
  radiusMeters: number
): District[] {
  if (serviceIndex.cells.size === 0) {
    return districtsToColor.map((district) => ({
      ...district,
      accessibilityIndex: 0,
      color: DEFAULT_DISTRICT_COLOR,
      serviceCount: 0,
      avgDistance: 0,
    }));
  }

  return districtsToColor.map((district) => {
    const samplePoints = DISTRICT_SAMPLE_POINTS.find((sample) => sample.id === district.id)?.points ?? [
      getCenterOfGeometry(district.geometry),
    ];
    const sampleResults = samplePoints.map((point) => calculateAccessibilityAtPoint(point, serviceIndex, radiusMeters));
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
  serviceIndex: ServiceSpatialIndex,
  radiusMeters: number
): { accessibilityIndex: number; serviceCount: number; avgDistance: number } {
  const nearbyServices = queryServicesWithinRadius(serviceIndex, point, radiusMeters).map((service) => {
    const distance = haversineDistance(point, service.coordinates);

    return {
      ...service,
      distance,
      straightDistance: distance,
      duration: distance / WALKING_SPEED_METERS_PER_SECOND,
    };
  });

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

function getNearestKnownAddress(point: [number, number], servicesToUse: Service[], fallbackAddress: string): string {
  const nearestService = servicesToUse
    .filter((service) => service.address || service.name)
    .map((service) => ({
      service,
      distance: haversineDistance(point, service.coordinates),
    }))
    .sort((a, b) => a.distance - b.distance)[0]?.service;

  return nearestService?.address || nearestService?.name || fallbackAddress;
}

function getPointKey(point: [number, number]): string {
  return `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
}

export default App;
