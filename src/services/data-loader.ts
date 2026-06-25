import axios from 'axios';
import type { Service, District, GeoJSON } from '../types';

export class DataLoader {
  /**
   * Load GeoJSON file
   */
  static async loadGeoJSON(url: string): Promise<GeoJSON> {
    try {
      const response = await axios.get<GeoJSON>(url);
      return response.data;
    } catch (error) {
      console.error(`Failed to load GeoJSON from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Parse services from GeoJSON
   */
  static parseServices(geojson: GeoJSON): Service[] {
    const services: Service[] = [];

    geojson.features.forEach((feature) => {
      const props = feature.properties as Record<string, unknown>;
      const coords = (feature.geometry as any).coordinates;

      const service: Service = {
        id: props.id as string,
        name: (props.name as string) || 'Unknown',
        category: (props.category as any) || 'shop',
        coordinates: coords,
        address: props.address as string | undefined,
      };

      services.push(service);
    });

    return services;
  }

  /**
   * Parse districts from GeoJSON
   */
  static parseDistricts(geojson: GeoJSON): District[] {
    const districts: District[] = [];

    geojson.features.forEach((feature) => {
      const props = feature.properties as Record<string, unknown>;

      const district: District = {
        id: props.id as string,
        name: (props.name as string) || 'Unknown',
        geometry: feature.geometry,
      };

      districts.push(district);
    });

    return districts;
  }

  /**
   * Filter services by category
   */
  static filterByCategory(services: Service[], category: string): Service[] {
    return services.filter((s) => s.category === category);
  }

  /**
   * Filter services by distance
   */
  static filterByDistance(services: Service[], maxDistanceMeters: number): Service[] {
    return services.filter((s) => s.distance !== undefined && s.distance <= maxDistanceMeters);
  }

  /**
   * Get service statistics
   */
  static getStatistics(
    services: Service[]
  ): Record<string, { count: number; avgDistance: number }> {
    const stats: Record<string, { count: number; avgDistance: number }> = {};

    const categories = Array.from(new Set(services.map((s) => s.category)));

    categories.forEach((category) => {
      const categoryServices = services.filter((s) => s.category === category);
      const validServices = categoryServices.filter((s) => s.distance !== undefined);

      const avgDistance =
        validServices.length > 0
          ? validServices.reduce((sum, s) => sum + (s.distance || 0), 0) / validServices.length
          : 0;

      stats[category] = {
        count: categoryServices.length,
        avgDistance,
      };
    });

    return stats;
  }
}
