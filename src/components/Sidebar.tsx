import React, { useEffect, useMemo, useState } from 'react';
import type { Service, ServiceCategory } from '../types';
import { AccessibilityCalculator } from '../utils/accessibility-calculator';
import { ServiceList } from './ServiceList';
import './Sidebar.css';

interface SidebarProps {
  selectedPoint: [number, number] | null;
  selectedAddress: string | null;
  services: Service[];
  accessibilityIndex: number;
  radiusMeters: number;
  loading: boolean;
  onAddressSearch: (address: string) => void | Promise<void>;
  onRadiusChange: (radius: number) => void;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  selectedPoint,
  selectedAddress,
  services,
  accessibilityIndex,
  radiusMeters,
  loading,
  onAddressSearch,
  onRadiusChange,
  onClose,
}) => {
  const [addressValue, setAddressValue] = useState('');

  const distanceBands = useMemo(() => {
    return AccessibilityCalculator.groupByDistanceBand(services);
  }, [services]);

  const accessibilityLevel = AccessibilityCalculator.getAccessibilityLevel(accessibilityIndex);
  const accessibilityColor = AccessibilityCalculator.getAccessibilityColor(accessibilityLevel);

  useEffect(() => {
    setAddressValue(selectedAddress || '');
  }, [selectedAddress]);

  if (!selectedPoint) {
    return null;
  }

  const coordinates = `${selectedPoint[1].toFixed(4)}, ${selectedPoint[0].toFixed(4)}`;
  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onAddressSearch(addressValue);
  };

  const categories: ServiceCategory[] = ['shop', 'pharmacy', 'restaurant', 'gym', 'school', 'library'];
  const stats = Object.fromEntries(
    categories.map((cat) => {
      const count = services.filter((s) => s.category === cat).length;
      return [cat, count];
    })
  );

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Accessibility Analysis</h2>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="sidebar-content">
        {/* Location Info */}
        <section className="info-section">
          <h3>Selected Location</h3>
          <form className="location-search" onSubmit={handleAddressSubmit}>
            <input
              className="address-input"
              type="text"
              value={addressValue}
              disabled={loading}
              placeholder={coordinates}
              onChange={(event) => setAddressValue(event.target.value)}
            />
            <button className="location-search-button" type="submit" disabled={loading || !addressValue.trim()}>
              Search
            </button>
          </form>
          <p className="location-meta">{coordinates}</p>
        </section>

        {/* Radius Control */}
        <section className="info-section">
          <h3>Scoring Horizon</h3>
          <div className="radius-control">
            <input
              type="range"
              min={500}
              max={5000}
              step={100}
              value={radiusMeters}
              onChange={(event) => onRadiusChange(Number(event.target.value))}
            />
            <div className="radius-label">{(radiusMeters / 1000).toFixed(1)} km</div>
          </div>
          <p className="radius-help">Services farther away contribute less; outside this range they score 0.</p>
        </section>

        {/* Accessibility Index */}
        <section className="info-section">
          <h3>Accessibility Index</h3>
          <div
            className="accessibility-index"
            style={{ backgroundColor: accessibilityColor }}
          >
            <div className="index-value">{accessibilityIndex.toFixed(0)}</div>
            <div className="index-level">{accessibilityLevel.toUpperCase()}</div>
          </div>
          <p className="index-description">
            Category weights + distance decay, normalized to 0-100
          </p>
        </section>

        <section className="info-section">
          <h3>Neighborhood Legend</h3>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2ecc71' }} />
            <span>Good accessibility</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f1c40f' }} />
            <span>Medium accessibility</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#e74c3c' }} />
            <span>Bad accessibility</span>
          </div>
        </section>

        {/* Distance Bands Summary */}
        <section className="info-section">
          <h3>Services by Walking Time</h3>
          <div className="distance-bands">
            <div className="band">
              <div className="band-time">5 min</div>
              <div className="band-count">{distanceBands.band5min.length}</div>
            </div>
            <div className="band">
              <div className="band-time">10 min</div>
              <div className="band-count">{distanceBands.band10min.length}</div>
            </div>
            <div className="band">
              <div className="band-time">15 min</div>
              <div className="band-count">{distanceBands.band15min.length}</div>
            </div>
            <div className="band">
              <div className="band-time">Beyond</div>
              <div className="band-count">{distanceBands.beyond15min.length}</div>
            </div>
          </div>
        </section>

        {/* Category Summary */}
        <section className="info-section">
          <h3>Services by Category</h3>
          <div className="category-stats">
            {categories.map((cat) => (
              <div key={cat} className="category-item">
                <span className="category-name">{cat}</span>
                <span className="category-count">{stats[cat]}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Service List */}
        <section className="info-section full-height">
          <h3>Nearby Services</h3>
          <ServiceList services={services} />
        </section>
      </div>
    </div>
  );
};
