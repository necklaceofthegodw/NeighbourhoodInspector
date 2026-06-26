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
  selectedAddress: string | null;
  radiusMeters: number;
  loading: boolean;
}

const KATOWICE_COORDS: [number, number] = [50.2645, 19.0238];
const ZOOM_LEVEL = 12;
const MOBILE_BREAKPOINT_PX = 768;
const MOBILE_TOP_OVERLAY_PX = 88;
const MOBILE_BOTTOM_SHEET_RATIO = 0.58;
const MOBILE_BOTTOM_SHEET_MAX_PX = 520;

export const Map: React.FC<MapProps> = ({
  services,
  districts,
  onPointSelected,
  selectedPoint,
  selectedAddress,
  radiusMeters,
  loading,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersGroup = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const districtLayersGroup = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const districtLabelsGroup = useRef<L.FeatureGroup>(new L.FeatureGroup());
  const selectedPointMarker = useRef<L.Marker | null>(null);
  const searchRadiusCircle = useRef<L.Circle | null>(null);
  const onPointSelectedRef = useRef(onPointSelected);

  useEffect(() => {
    onPointSelectedRef.current = onPointSelected;
  }, [onPointSelected]);

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
        onPointSelectedRef.current([lng, lat]);
      });
    }

    return () => {
      // Don't destroy map on unmount
    };
  }, []);

  // Render districts
  useEffect(() => {
    if (!map.current || districts.length === 0) return;

    districtLayersGroup.current.clearLayers();
    districtLabelsGroup.current.clearLayers();

    districts.forEach((district) => {
      if (district.geometry.type === 'Polygon' || district.geometry.type === 'MultiPolygon') {
        const geoJsonLayer = L.geoJSON(district.geometry as any, {
          smoothFactor: 0.4,
          style: {
            color: '#333333',
            weight: 2,
            opacity: 0.75,
            fillColor: district.color || '#95a5a6',
            fillOpacity: 0.35,
          },
          onEachFeature: (_feature, layer) => {
            layer.on('mouseover', () => {
              (layer as any).setStyle({ weight: 3, fillOpacity: 0.45 });
            });
            layer.on('mouseout', () => {
              (layer as any).setStyle({ weight: 2, fillOpacity: 0.35 });
            });
            layer.on('click', (e: any) => {
              if (e.originalEvent) {
                L.DomEvent.stopPropagation(e.originalEvent);
              }
              const { lat, lng } = e.latlng;
              onPointSelectedRef.current([lng, lat]);
            });
          },
        } as L.GeoJSONOptions & { smoothFactor: number });

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

      if (selectedAddress) {
        selectedPointMarker.current.bindPopup(escapeHtml(selectedAddress)).openPopup();
      }

      const currentZoom = map.current.getZoom() ?? ZOOM_LEVEL;
      const selectedLatLng = L.latLng(selectedPoint[1], selectedPoint[0]);
      map.current.flyTo(getVisibleCenterForPoint(selectedLatLng, currentZoom), currentZoom);
    }
  }, [selectedAddress, selectedPoint]);

  // Update search radius
  useEffect(() => {
    if (!map.current) return;

    if (searchRadiusCircle.current) {
      map.current.removeLayer(searchRadiusCircle.current);
      searchRadiusCircle.current = null;
    }

    if (selectedPoint) {
      searchRadiusCircle.current = L.circle([selectedPoint[1], selectedPoint[0]], {
        radius: radiusMeters,
        color: '#1f78d1',
        weight: 2,
        opacity: 0.8,
        fillColor: '#1f78d1',
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(map.current);
    }
  }, [radiusMeters, selectedPoint]);

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

  function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      };
      return entities[char];
    });
  }

  function getVisibleCenterForPoint(latLng: L.LatLng, zoom: number): L.LatLng {
    if (!map.current || window.innerWidth > MOBILE_BREAKPOINT_PX) {
      return latLng;
    }

    const mapSize = map.current.getSize();
    const bottomOverlay = Math.min(window.innerHeight * MOBILE_BOTTOM_SHEET_RATIO, MOBILE_BOTTOM_SHEET_MAX_PX);
    const visibleHeight = Math.max(160, mapSize.y - MOBILE_TOP_OVERLAY_PX - bottomOverlay);
    const desiredMarkerPoint = L.point(mapSize.x / 2, MOBILE_TOP_OVERLAY_PX + visibleHeight / 2);
    const mapCenterPoint = L.point(mapSize.x / 2, mapSize.y / 2);
    const projectedMarkerPoint = map.current.project(latLng, zoom);
    const projectedCenter = projectedMarkerPoint.subtract(desiredMarkerPoint.subtract(mapCenterPoint));

    return map.current.unproject(projectedCenter, zoom);
  }

  return (
    <div className="map-container">
      <div ref={mapContainer} className="map" />
      {loading && <div className="map-loading">Loading services...</div>}
    </div>
  );
};
