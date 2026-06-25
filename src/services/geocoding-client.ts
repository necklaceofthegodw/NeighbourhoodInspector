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

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';

class GeocodingClient {
  private cache = new Map<string, string>();

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
