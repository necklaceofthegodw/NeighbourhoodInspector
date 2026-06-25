import type { Service, AccessibilityResult } from '../types';

export class AccessibilityCalculator {
  /**
   * Calculate accessibility index based on services and distances
   * Formula: index = service_count / avg_distance_in_km
   */
  static calculateIndex(services: Service[]): number {
    if (services.length === 0) return 0;

    const validServices = services.filter((s) => s.distance !== undefined);
    if (validServices.length === 0) return 0;

    const totalDistance = validServices.reduce((sum, s) => sum + (s.distance || 0), 0);
    const avgDistanceKm = (totalDistance / validServices.length) / 1000;

    if (avgDistanceKm === 0) return 0;

    return validServices.length / avgDistanceKm;
  }

  /**
   * Group services by distance bands (5, 10, 15 min walking time)
   */
  static groupByDistanceBand(
    services: Service[]
  ): {
    band5min: Service[];
    band10min: Service[];
    band15min: Service[];
    beyond15min: Service[];
  } {
    // Average walking speed: ~1.4 m/s (5 km/h)
    const band5minDistance = 5 * 60 * 1.4; // ~420m
    const band10minDistance = 10 * 60 * 1.4; // ~840m
    const band15minDistance = 15 * 60 * 1.4; // ~1260m

    return {
      band5min: services.filter((s) => s.distance !== undefined && s.distance <= band5minDistance),
      band10min: services.filter(
        (s) => s.distance !== undefined && s.distance > band5minDistance && s.distance <= band10minDistance
      ),
      band15min: services.filter(
        (s) => s.distance !== undefined && s.distance > band10minDistance && s.distance <= band15minDistance
      ),
      beyond15min: services.filter((s) => s.distance !== undefined && s.distance > band15minDistance),
    };
  }

  /**
   * Format distance for display
   */
  static formatDistance(meters: number | undefined): string {
    if (meters === undefined) return 'N/A';
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(2)}km`;
  }

  /**
   * Format duration for display
   */
  static formatDuration(seconds: number | undefined): string {
    if (seconds === undefined) return 'N/A';
    const minutes = Math.round(seconds / 60);
    if (minutes === 0) return '<1 min';
    return `${minutes} min`;
  }

  /**
   * Create accessibility result from point and services
   */
  static createResult(point: [number, number], services: Service[]): AccessibilityResult {
    return {
      point,
      services,
      accessibilityIndex: this.calculateIndex(services),
      timestamp: Date.now(),
    };
  }

  /**
   * Determine accessibility level based on index
   */
  static getAccessibilityLevel(index: number): 'good' | 'medium' | 'bad' {
    if (index >= 250) return 'good';
    if (index >= 75) return 'medium';
    return 'bad';
  }

  /**
   * Get color for accessibility level
   */
  static getAccessibilityColor(level: string): string {
    const colors: Record<string, string> = {
      good: '#2ecc71',
      medium: '#f1c40f',
      bad: '#e74c3c',
    };
    return colors[level] || '#95a5a6';
  }
}
