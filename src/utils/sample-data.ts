import type { Service, District, ServiceCategory } from '../types';
import { katowiceDistricts } from '../data/katowice-districts';

// Katowice bounds
const KATOWICE_BOUNDS = {
  minLat: 50.15,
  maxLat: 50.38,
  minLon: 18.95,
  maxLon: 19.25,
};

/**
 * Generate sample service data for testing
 */
export function generateSampleServices(count: number = 200): Service[] {
  const services: Service[] = [];
  const categories: ServiceCategory[] = ['shop', 'pharmacy', 'restaurant', 'gym', 'school', 'library'];

  for (let i = 0; i < count; i++) {
    const lat =
      KATOWICE_BOUNDS.minLat +
      Math.random() * (KATOWICE_BOUNDS.maxLat - KATOWICE_BOUNDS.minLat);
    const lon =
      KATOWICE_BOUNDS.minLon +
      Math.random() * (KATOWICE_BOUNDS.maxLon - KATOWICE_BOUNDS.minLon);

    const category = categories[Math.floor(Math.random() * categories.length)];
    const names: Record<ServiceCategory, string[]> = {
      shop: ['Supermarket', 'Grocery Store', 'Bakery', 'Market', 'Boutique'],
      pharmacy: ['Pharmacy', 'Drug Store'],
      restaurant: ['Restaurant', 'Cafe', 'Pizza Place', 'Bistro', 'Bar'],
      gym: ['Fitness Center', 'Gym', 'Sports Club'],
      school: ['Primary School', 'High School', 'Educational Center'],
      library: ['Public Library', 'Community Library'],
    };

    const nameList = names[category];
    const baseName = nameList[Math.floor(Math.random() * nameList.length)];

    services.push({
      id: `service_${i}`,
      name: `${baseName} ${Math.floor(Math.random() * 1000)}`,
      category,
      coordinates: [lon, lat],
      address: `Street ${Math.floor(Math.random() * 100)}, Katowice`,
    });
  }

  return services;
}

/**
 * Generate sample district data with boundaries
 */
export function generateSampleDistricts(): District[] {
  return katowiceDistricts.map((district) => ({
    ...district,
    accessibilityIndex: 0,
    color: '#95a5a6',
  }));
}

/**
 * Export sample data as GeoJSON files (for reference)
 */
export function generateServicesGeoJSON() {
  const services = generateSampleServices();
  return {
    type: 'FeatureCollection',
    features: services.map((service) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: service.coordinates,
      },
      properties: {
        id: service.id,
        name: service.name,
        category: service.category,
        address: service.address,
      },
    })),
  };
}

export function generateDistrictsGeoJSON() {
  const districts = generateSampleDistricts();
  return {
    type: 'FeatureCollection',
    features: districts.map((district) => ({
      type: 'Feature',
      geometry: district.geometry,
      properties: {
        id: district.id,
        name: district.name,
      },
    })),
  };
}
