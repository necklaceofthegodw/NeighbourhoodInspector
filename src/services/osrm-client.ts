import axios from 'axios';
import type { OSRMResponse, Service } from '../types';

// Public OSRM demo server
const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1/foot';

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
  const earthRadius = 6371000;
  return earthRadius * c;
}

export class OSRMClient {
  private cache = new Map<string, { distance: number; duration: number }>();

  /**
   * Calculate walking distance between two points using OSRM
   */
  async getDistance(
    from: [number, number],
    to: [number, number]
  ): Promise<{ distance: number; duration: number } | null> {
    const cacheKey = `${from[0]},${from[1]}->${to[0]},${to[1]}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) || null;
    }

    try {
      const url = `${OSRM_BASE_URL}/${from[0]},${from[1]};${to[0]},${to[1]}`;
      const response = await axios.get<OSRMResponse>(url, {
        timeout: 5000,
      });

      if (response.data.code === 'Ok' && response.data.routes.length > 0) {
        const route = response.data.routes[0];
        const result = {
          distance: route.distance,
          duration: route.duration,
        };

        // Cache result
        this.cache.set(cacheKey, result);
        return result;
      }

      return null;
    } catch (error) {
      console.error('OSRM request failed:', error);
      return null;
    }
  }

  /**
   * Calculate distances from one point to multiple services
   */
  async getDistancesToServices(
    from: [number, number],
    services: Service[]
  ): Promise<Service[]> {
    const enrichedServices: Service[] = [];

    // Process services in parallel (but with reasonable batching)
    const batchSize = 10;
    for (let i = 0; i < services.length; i += batchSize) {
      const batch = services.slice(i, i + batchSize);
      const promises = batch.map(async (service) => {
        const result = await this.getDistance(from, service.coordinates);
        return {
          ...service,
          distance: result?.distance,
          duration: result?.duration,
          straightDistance: haversineDistance(from, service.coordinates),
        };
      });

      const batchResults = await Promise.all(promises);
      enrichedServices.push(...batchResults);

      // Small delay to avoid rate limiting
      if (i + batchSize < services.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Sort by OSRM distance, falling back to straight-line distance
    return enrichedServices.sort((a, b) => {
      const aDist = a.distance ?? a.straightDistance ?? Infinity;
      const bDist = b.distance ?? b.straightDistance ?? Infinity;
      return aDist - bDist;
    });
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const osrmClient = new OSRMClient();
