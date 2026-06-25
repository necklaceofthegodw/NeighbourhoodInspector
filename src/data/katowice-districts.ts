import type { District } from '../types';
import geo from './katowice-districts.generated';

type Position = [number, number];

const SIMPLIFICATION_TOLERANCE = 0.0002;
const KATOWICE_LATITUDE_SCALE = Math.cos((50.2645 * Math.PI) / 180);

function getDistrictName(feature: any): string | null {
  const properties = feature.properties || {};
  const tags = properties.tags || {};
  return properties.name || properties['name:pl'] || tags.name || tags['name:pl'] || null;
}

function simplifyGeometry(geometry: any) {
  if (geometry.type === 'Polygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map(simplifyRing),
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon: Position[][]) => polygon.map(simplifyRing)),
    };
  }

  return geometry;
}

function simplifyRing(ring: Position[]): Position[] {
  if (ring.length <= 8) {
    return ring;
  }

  const isClosed = pointsEqual(ring[0], ring[ring.length - 1]);
  const openRing = isClosed ? ring.slice(0, -1) : ring.slice();

  if (openRing.length <= 8) {
    return closeRing(openRing);
  }

  const splitIndex = findFarthestPointIndex(openRing, openRing[0]);
  const firstArc = openRing.slice(0, splitIndex + 1);
  const secondArc = [...openRing.slice(splitIndex), openRing[0]];

  const simplified = [
    ...simplifyLine(firstArc, SIMPLIFICATION_TOLERANCE),
    ...simplifyLine(secondArc, SIMPLIFICATION_TOLERANCE).slice(1, -1),
  ];

  return simplified.length >= 3 ? closeRing(simplified) : ring;
}

function simplifyLine(points: Position[], tolerance: number): Position[] {
  if (points.length <= 2) {
    return points;
  }

  let maxDistance = 0;
  let maxIndex = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = pointToSegmentDistance(points[i], start, end);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance <= tolerance) {
    return [start, end];
  }

  return [
    ...simplifyLine(points.slice(0, maxIndex + 1), tolerance).slice(0, -1),
    ...simplifyLine(points.slice(maxIndex), tolerance),
  ];
}

function pointToSegmentDistance(point: Position, start: Position, end: Position): number {
  const x = point[0] * KATOWICE_LATITUDE_SCALE;
  const y = point[1];
  const x1 = start[0] * KATOWICE_LATITUDE_SCALE;
  const y1 = start[1];
  const x2 = end[0] * KATOWICE_LATITUDE_SCALE;
  const y2 = end[1];
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  const projection = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (x1 + projection * dx), y - (y1 + projection * dy));
}

function findFarthestPointIndex(points: Position[], from: Position): number {
  let maxDistance = 0;
  let maxIndex = Math.floor(points.length / 2);

  points.forEach((point, index) => {
    const distance = Math.hypot(
      (point[0] - from[0]) * KATOWICE_LATITUDE_SCALE,
      point[1] - from[1]
    );
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = index;
    }
  });

  return maxIndex;
}

function closeRing(ring: Position[]): Position[] {
  return pointsEqual(ring[0], ring[ring.length - 1]) ? ring : [...ring, ring[0]];
}

function pointsEqual(first: Position, second: Position): boolean {
  return first[0] === second[0] && first[1] === second[1];
}

export const katowiceDistricts: District[] = (geo.features || [])
  .filter((feature: any) => {
    const geometryType = feature.geometry?.type;
    return getDistrictName(feature) && (geometryType === 'Polygon' || geometryType === 'MultiPolygon');
  })
  .map((feature: any, idx: number) => ({
    id: feature.id ? String(feature.id) : `d${idx + 1}`,
    name: getDistrictName(feature) || `Dzielnica ${idx + 1}`,
    geometry: simplifyGeometry(feature.geometry),
    accessibilityIndex: 0,
    color: '#95a5a6',
  }));
