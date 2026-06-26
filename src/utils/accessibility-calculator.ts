import type { Service, AccessibilityResult, ServiceCategory } from '../types';

const CATEGORY_WEIGHTS: Record<ServiceCategory, number> = {
  shop: 1,
  pharmacy: 1,
  school: 0.9,
  library: 0.6,
  restaurant: 0.5,
  gym: 0.4,
};

const DEFAULT_MAX_DISTANCE_METERS = 2500;
const DISTANCE_DECAY_BETA_PER_KM = 1.2;
const DUPLICATE_SERVICE_WEIGHTS = [1, 0.5, 0.25];

export class AccessibilityCalculator {
  /**
   * Calculate a Walk Score-like accessibility index from 0 to 100.
   * Services are grouped by category, weighted by category importance,
   * and discounted with a gravity-style distance decay.
   */
  static calculateIndex(
    services: Service[],
    maxDistanceMeters = DEFAULT_MAX_DISTANCE_METERS
  ): number {
    if (services.length === 0) return 0;

    const validServices = services.filter(
      (s) => s.distance !== undefined && s.distance <= maxDistanceMeters
    );
    if (validServices.length === 0) return 0;

    const totalWeight = Object.values(CATEGORY_WEIGHTS).reduce((sum, weight) => sum + weight, 0);

    const weightedScore = Object.entries(CATEGORY_WEIGHTS).reduce((sum, [category, categoryWeight]) => {
      const categoryServices = validServices
        .filter((service) => service.category === category)
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
        .slice(0, DUPLICATE_SERVICE_WEIGHTS.length);

      const categoryContribution = Math.min(
        categoryServices.reduce((categorySum, service, index) => {
          const duplicateWeight = DUPLICATE_SERVICE_WEIGHTS[index] ?? 0;
          return categorySum + duplicateWeight * this.getDistanceDecay(
            service.distance ?? Infinity,
            maxDistanceMeters
          );
        }, 0),
        1
      );

      return sum + categoryWeight * categoryContribution;
    }, 0);

    return (weightedScore / totalWeight) * 100;
  }

  static getDistanceDecay(
    distanceMeters: number,
    maxDistanceMeters = DEFAULT_MAX_DISTANCE_METERS
  ): number {
    if (!Number.isFinite(distanceMeters) || distanceMeters > maxDistanceMeters) {
      return 0;
    }

    const distanceKm = distanceMeters / 1000;
    return Math.exp(-DISTANCE_DECAY_BETA_PER_KM * distanceKm);
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
    if (index >= 70) return 'good';
    if (index >= 40) return 'medium';
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
