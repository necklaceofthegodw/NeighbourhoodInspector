import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Service, District } from '../types';

import './Map.css';

interface MapProps {
  services: Service[];
  districts: District[];
  onPointSelected: (point: [number, number]) => void;
  selectedPoint: [number, number] | null;
  loading: boolean;
}

const KATOWICE_COORDS: [number, number] = [50.2645, 19.0238];
const ZOOM_LEVEL = 12;

export const Map: React.FC<MapProps> = ({
  services,
  districts,
  onPointSelected,
  selectedPoint,
  loading,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const districtLayersGroup = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const districtLabelsGroup = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const selectedPointMarker = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current) return;

    if (!map.current) {
      map.current = L.map(mapContainer.current).setView(KATOWICE_COORDS, ZOOM_LEVEL);

      L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 19,
        attribution: 'Map data ©2026 Google',
      }).addTo(map.current);

      // Add empty groups
      districtLayersGroup.current.addTo(map.current);
      districtLabelsGroup.current.addTo(map.current);
      markersGroup.current.addTo(map.current);

      // Map click handler
      map.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        onPointSelected([lng, lat]);
      });
    }

    return () => {
      // Don't destroy map on unmount
    };
  }, [onPointSelected]);

  // Render districts
  useEffect(() => {
    if (!map.current || districts.length === 0) return;

    districtLayersGroup.current.clearLayers();
    districtLabelsGroup.current.clearLayers();

    districts.forEach((district) => {
      if (district.geometry.type === 'Polygon' || district.geometry.type === 'MultiPolygon') {
        const geoJsonLayer = L.geoJSON(district.geometry as any, {
          style: {
            color: '#333333',
            weight: 2.5,
            opacity: 0.85,
            fillColor: district.color || '#95a5a6',
            fillOpacity: 0.35,
          },
          onEachFeature: (_feature, layer) => {
            layer.bindPopup(`<strong>${district.name}</strong>`);
            layer.on('mouseover', () => {
              layer.setStyle({ weight: 4, fillOpacity: 0.45 });
            });
            layer.on('mouseout', () => {
              layer.setStyle({ weight: 2.5, fillOpacity: 0.35 });
            });
            layer.on('click', (e: any) => {
              const { lat, lng } = e.latlng;
              onPointSelected([lng, lat]);
            });
          },
        });

        districtLayersGroup.current.addLayer(geoJsonLayer);

        const centroid = getPolygonCentroid(district.geometry as any);
        if (centroid) {
          const label = L.marker([centroid[1], centroid[0]], {
            icon: L.divIcon({
              className: 'district-label',
              html: `<div class="district-label-text">${district.name}</div>`,
              iconAnchor: [0, 0],
            }),
            interactive: false,
          });
          districtLabelsGroup.current.addLayer(label);
        }
      }
    });
  }, [districts]);

  // Render service markers
  useEffect(() => {
    if (!map.current) return;

    markersGroup.current.clearLayers();

    const categoryStyles: Record<string, { color: string; icon: string; label: string }> = {
      shop: { color: '#3498db', icon: '🛒', label: 'Shop' },
      pharmacy: { color: '#e74c3c', icon: '💊', label: 'Pharmacy' },
      restaurant: { color: '#f39c12', icon: '🍽️', label: 'Restaurant' },
      gym: { color: '#27ae60', icon: '🏋️', label: 'Gym' },
      school: { color: '#9b59b6', icon: '🏫', label: 'School' },
      library: { color: '#16a085', icon: '📚', label: 'Library' },
    };

    services.forEach((service) => {
      const style = categoryStyles[service.category] || {
        color: '#95a5a6',
        icon: '📍',
        label: service.category,
      };

      const icon = L.divIcon({
        className: 'service-marker',
        html: `<div class="service-marker-icon" style="background-color: ${style.color};">${style.icon}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([service.coordinates[1], service.coordinates[0]], {
        icon,
      }).bindPopup(`<strong>${service.name}</strong><br>${service.category}`);

      markersGroup.current.addLayer(marker);
    });
  }, [services]);

  // Update selected point marker
  useEffect(() => {
    if (!map.current) return;

    if (selectedPointMarker.current) {
      map.current.removeLayer(selectedPointMarker.current);
      selectedPointMarker.current = null;
    }

    if (selectedPoint) {
      const icon = L.divIcon({
        className: 'selected-point-marker',
        html: '<div class="selected-point-icon"></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      selectedPointMarker.current = L.marker([selectedPoint[1], selectedPoint[0]], {
        icon,
      }).addTo(map.current);

      const currentZoom = map.current.getZoom() ?? ZOOM_LEVEL;
      map.current.flyTo([selectedPoint[1], selectedPoint[0]], currentZoom);
    }
  }, [selectedPoint]);

  function getPolygonCentroid(geometry: any): [number, number] | null {
    if (geometry.type !== 'Polygon') return null;
    const coords = geometry.coordinates[0] as [number, number][];
    if (!coords || coords.length === 0) return null;

    let sumX = 0;
    let sumY = 0;
    coords.forEach(([x, y]) => {
      sumX += x;
      sumY += y;
    });

    return [sumX / coords.length, sumY / coords.length];
  }

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
      {loading && <div className="map-loading">Loading services...</div>}
    </div>
  );
};
