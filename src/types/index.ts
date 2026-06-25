// Service/POI types and categories
export type ServiceCategory = 'shop' | 'pharmacy' | 'restaurant' | 'gym' | 'school' | 'library';

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  coordinates: [number, number]; // [lon, lat]
  address?: string;
  distance?: number; // in meters
  duration?: number; // in seconds
  straightDistance?: number; // direct straight-line distance in meters
}

export interface District {
  id: string;
  name: string;
  geometry: GeoJSON.Geometry;
  accessibilityIndex?: number;
  color?: string;
  serviceCount?: number;
  avgDistance?: number;
}

export interface AccessibilityResult {
  point: [number, number]; // [lon, lat]
  services: Service[];
  accessibilityIndex: number;
  timestamp: number;
}

export interface OSRMResponse {
  code: string;
  routes: Array<{
    distance: number;
    duration: number;
  }>;
}

export interface MapState {
  selectedPoint: [number, number] | null;
  selectedAddress: string | null;
  selectedServices: Service[];
  loading: boolean;
  error: string | null;
}

export interface GeoJSON {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: GeoJSON.Geometry;
    properties: Record<string, unknown>;
  }>;
}

export namespace GeoJSON {
  export interface Geometry {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon' | 'MultiPoint' | 'MultiLineString';
    coordinates: unknown;
  }
}
