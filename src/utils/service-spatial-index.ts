import type { Service } from '../types';

const EARTH_RADIUS_METERS = 6371000;
const METERS_PER_DEGREE_LATITUDE = 111320;
const DEFAULT_CELL_SIZE_DEGREES = 0.01;

export interface ServiceSpatialIndex {
  readonly cellSizeDegrees: number;
  readonly cells: Map<string, Service[]>;
}

export function createServiceSpatialIndex(
  services: Service[],
  cellSizeDegrees = DEFAULT_CELL_SIZE_DEGREES
): ServiceSpatialIndex {
  const cells = new Map<string, Service[]>();

  services.forEach((service) => {
    const key = getCellKey(service.coordinates, cellSizeDegrees);
    const cell = cells.get(key);

    if (cell) {
      cell.push(service);
      return;
    }

    cells.set(key, [service]);
  });

  return {
    cellSizeDegrees,
    cells,
  };
}

export function queryServicesWithinRadius(
  index: ServiceSpatialIndex,
  point: [number, number],
  radiusMeters: number
): Service[] {
  const [lon, lat] = point;
  const latDelta = radiusMeters / METERS_PER_DEGREE_LATITUDE;
  const lonDelta = radiusMeters / getMetersPerDegreeLongitude(lat);
  const minCellLon = getCellIndex(lon - lonDelta, index.cellSizeDegrees);
  const maxCellLon = getCellIndex(lon + lonDelta, index.cellSizeDegrees);
  const minCellLat = getCellIndex(lat - latDelta, index.cellSizeDegrees);
  const maxCellLat = getCellIndex(lat + latDelta, index.cellSizeDegrees);
  const servicesById = new Map<string, Service>();

  for (let cellLon = minCellLon; cellLon <= maxCellLon; cellLon += 1) {
    for (let cellLat = minCellLat; cellLat <= maxCellLat; cellLat += 1) {
      const services = index.cells.get(`${cellLon}:${cellLat}`);

      if (!services) {
        continue;
      }

      services.forEach((service) => {
        if (servicesById.has(service.id)) {
          return;
        }

        if (haversineDistance(point, service.coordinates) <= radiusMeters) {
          servicesById.set(service.id, service);
        }
      });
    }
  }

  return Array.from(servicesById.values());
}

export function haversineDistance(from: [number, number], to: [number, number]): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

function getCellKey(point: [number, number], cellSizeDegrees: number): string {
  const [lon, lat] = point;

  return `${getCellIndex(lon, cellSizeDegrees)}:${getCellIndex(lat, cellSizeDegrees)}`;
}

function getCellIndex(value: number, cellSizeDegrees: number): number {
  return Math.floor(value / cellSizeDegrees);
}

function getMetersPerDegreeLongitude(latitude: number): number {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const meters = METERS_PER_DEGREE_LATITUDE * Math.cos(latitudeRadians);

  return Math.max(meters, 1);
}
