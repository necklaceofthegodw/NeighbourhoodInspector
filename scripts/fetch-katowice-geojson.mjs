import axios from 'axios';
import osmtogeojson from 'osmtogeojson';
import fs from 'fs/promises';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

const query = `
[out:json][timeout:25];
area["name"="Katowice"]->.a;
relation(area.a)["boundary"="administrative"]["admin_level"~"9|10"];
out geom;
`;

async function fetchAndSave() {
  try {
    console.log('Sending Overpass request...');
    const res = await axios.get(OVERPASS_URL, {
      params: { data: query },
      responseType: 'json',
      timeout: 60000,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'User-Agent': 'NeighbourhoodInspector/1.0 (https://github.com)'
      }
    });

    const osmJson = res.data;
    console.log('Converting to GeoJSON...');
    const geo = osmtogeojson(osmJson);

    const outPath = './src/data/katowice-districts.json';
    await fs.writeFile(outPath, JSON.stringify(geo, null, 2), 'utf8');
    console.log(`Saved GeoJSON to ${outPath}`);

    // Also write a small TS wrapper that imports the geojson at runtime
    const tsWrapper = `import data from './katowice-districts.json';\nexport default data;\n`;
    await fs.writeFile('./src/data/katowice-districts.generated.ts', tsWrapper, 'utf8');
    console.log('Wrote src/data/katowice-districts.generated.ts');
  } catch (e) {
    console.error('Failed to fetch or save GeoJSON', e.message || e);
    process.exit(1);
  }
}

fetchAndSave();
