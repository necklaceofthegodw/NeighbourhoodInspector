import axios from 'axios';
import fs from 'fs/promises';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const OUTPUT_PATH = './public/katowice-services.json';

const query = `
[out:json][timeout:120];
area["name"="Katowice"]["boundary"="administrative"]["admin_level"="8"]->.katowice;
(
  nwr["shop"](area.katowice);
  nwr["amenity"~"^(pharmacy|restaurant|fast_food|cafe|bar|pub|food_court|school|library)$"](area.katowice);
  nwr["leisure"~"^(fitness_centre|sports_centre)$"](area.katowice);
  nwr["amenity"="gym"](area.katowice);
);
out tags center;
`;

const RESTAURANT_AMENITIES = new Set(['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'food_court']);

function getCategory(tags) {
  if (tags.amenity === 'pharmacy') return 'pharmacy';
  if (tags.amenity === 'school') return 'school';
  if (tags.amenity === 'library') return 'library';
  if (RESTAURANT_AMENITIES.has(tags.amenity)) return 'restaurant';
  if (tags.leisure === 'fitness_centre' || tags.leisure === 'sports_centre' || tags.amenity === 'gym') return 'gym';
  if (tags.shop) return 'shop';
  return null;
}

function getCoordinates(element) {
  if (typeof element.lon === 'number' && typeof element.lat === 'number') {
    return [element.lon, element.lat];
  }

  if (element.center && typeof element.center.lon === 'number' && typeof element.center.lat === 'number') {
    return [element.center.lon, element.center.lat];
  }

  return null;
}

function getName(tags, category) {
  return tags.name || tags.brand || tags.operator || tags.shop || tags.amenity || tags.leisure || category;
}

function getAddress(tags) {
  const street = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const postcode = tags['addr:postcode'];
  const city = tags['addr:city'] || 'Katowice';

  if (street && houseNumber && postcode) {
    return `${street} ${houseNumber}, ${postcode}, ${city}`;
  }

  if (street && houseNumber) {
    return `${street} ${houseNumber}, ${city}`;
  }

  if (street) {
    return `${street}, ${city}`;
  }

  return city;
}

function toService(element) {
  const tags = element.tags || {};
  const category = getCategory(tags);
  const coordinates = getCoordinates(element);

  if (!category || !coordinates) {
    return null;
  }

  return {
    id: `osm_${element.type}_${element.id}`,
    name: String(getName(tags, category)),
    category,
    coordinates,
    address: getAddress(tags),
  };
}

async function fetchAndSave() {
  console.log('Sending Overpass request for Katowice services...');

  const body = new URLSearchParams({ data: query });
  const response = await axios.post(OVERPASS_URL, body, {
    responseType: 'json',
    timeout: 180000,
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'NeighbourhoodInspector/1.0 (local data refresh)',
    },
  });

  const services = response.data.elements
    .map(toService)
    .filter(Boolean)
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(services, null, 2)}\n`, 'utf8');
  console.log(`Saved ${services.length} services to ${OUTPUT_PATH}`);
}

fetchAndSave().catch((error) => {
  console.error('Failed to fetch Katowice services:', error.message || error);
  process.exit(1);
});
