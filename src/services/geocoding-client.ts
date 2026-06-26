interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  cycleway?: string;
  neighbourhood?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
}

interface NominatimReverseResponse {
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
}

interface NominatimSearchResponse extends NominatimReverseResponse {
  lat: string;
  lon: string;
}

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const KATOWICE_VIEWBOX = '18.83,50.34,19.18,50.15';

class GeocodingClient {
  private cache = new Map<string, string>();
  private searchCache = new Map<string, { point: [number, number]; address: string }>();

  async reverseGeocode(point: [number, number]): Promise<string | null> {
    const cacheKey = `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = new URL(NOMINATIM_REVERSE_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', String(point[1]));
    url.searchParams.set('lon', String(point[0]));
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'pl');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = (await response.json()) as NominatimReverseResponse;
      const address = formatAddress(data);
      if (address) {
        this.cache.set(cacheKey, address);
      }

      return address;
    } catch (error) {
      console.warn('Reverse geocoding failed:', error);
      return null;
    }
  }

  async searchAddress(query: string): Promise<{ point: [number, number]; address: string } | null> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return null;
    }

    const cacheKey = normalizedQuery.toLowerCase();
    const cached = this.searchCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const url = new URL(NOMINATIM_SEARCH_URL);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('q', normalizedQuery.match(/katowice/i) ? normalizedQuery : `${normalizedQuery}, Katowice`);
    url.searchParams.set('limit', '1');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('accept-language', 'pl');
    url.searchParams.set('countrycodes', 'pl');
    url.searchParams.set('viewbox', KATOWICE_VIEWBOX);
    url.searchParams.set('bounded', '1');

    try {
      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const [result] = (await response.json()) as NominatimSearchResponse[];
      if (!result) {
        return null;
      }

      const lat = Number(result.lat);
      const lon = Number(result.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
        return null;
      }

      const address = formatAddress(result) || result.display_name || normalizedQuery;
      const geocoded = {
        point: [lon, lat] as [number, number],
        address,
      };

      this.searchCache.set(cacheKey, geocoded);
      return geocoded;
    } catch (error) {
      console.warn('Forward geocoding failed:', error);
      return null;
    }
  }
}

function formatAddress(data: NominatimReverseResponse): string | null {
  const address = data.address;
  const street = address?.road || address?.pedestrian || address?.footway || address?.cycleway;

  if (street && address?.house_number) {
    return `${street} ${address.house_number}`;
  }

  if (street) {
    return street;
  }

  const area = address?.neighbourhood || address?.suburb || address?.city_district;
  if (data.name && area) {
    return `${data.name}, ${area}`;
  }

  if (data.name) {
    return data.name;
  }

  return data.display_name?.split(',').slice(0, 3).join(', ').trim() || null;
}

export const geocodingClient = new GeocodingClient();
