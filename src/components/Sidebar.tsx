import React, { useEffect, useMemo, useState } from 'react';
import type { Translation } from '../i18n';
import type { Service, ServiceCategory } from '../types';
import { AccessibilityCalculator } from '../utils/accessibility-calculator';
import { ServiceList } from './ServiceList';
import './Sidebar.css';

type SheetState = 'peek' | 'half' | 'full';

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
  labels: Translation;
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
  labels,
}) => {
  const [addressValue, setAddressValue] = useState('');
  const [sheetState, setSheetState] = useState<SheetState>('half');

  const distanceBands = useMemo(() => {
    return AccessibilityCalculator.groupByDistanceBand(services);
  }, [services]);

  const accessibilityLevel = AccessibilityCalculator.getAccessibilityLevel(accessibilityIndex);
  const accessibilityColor = AccessibilityCalculator.getAccessibilityColor(accessibilityLevel);
  const accessibilityLevelLabel = labels.levels[accessibilityLevel];

  useEffect(() => {
    setAddressValue(selectedAddress || '');
  }, [selectedAddress]);

  useEffect(() => {
    if (selectedPoint) {
      setSheetState('half');
    }
  }, [selectedPoint]);

  if (!selectedPoint) {
    return null;
  }

  const coordinates = `${selectedPoint[1].toFixed(4)}, ${selectedPoint[0].toFixed(4)}`;
  const categories: ServiceCategory[] = ['shop', 'pharmacy', 'restaurant', 'gym', 'school', 'library'];
  const stats = Object.fromEntries(
    categories.map((cat) => {
      const count = services.filter((s) => s.category === cat).length;
      return [cat, count];
    })
  );

  const handleAddressSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onAddressSearch(addressValue);
  };

  return (
    <div className={`sidebar sheet-${sheetState}`}>
      <button
        className="sheet-handle"
        type="button"
        aria-label={labels.sidebar.togglePanel}
        onClick={() => setSheetState(sheetState === 'peek' ? 'half' : 'peek')}
      >
        <span />
      </button>

      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <h2>{labels.sidebar.analysisTitle}</h2>
          <div className="mobile-score-summary">
            <span style={{ backgroundColor: accessibilityColor }}>{accessibilityIndex.toFixed(0)}</span>
            <strong>{accessibilityLevelLabel.toUpperCase()}</strong>
            <em>{selectedAddress || coordinates}</em>
          </div>
        </div>

        <div className="sidebar-actions">
          <div className="sheet-size-controls" aria-label={labels.sidebar.panelSize}>
            <button type="button" className={sheetState === 'peek' ? 'active' : ''} onClick={() => setSheetState('peek')}>
              {labels.sidebar.min}
            </button>
            <button type="button" className={sheetState === 'half' ? 'active' : ''} onClick={() => setSheetState('half')}>
              {labels.sidebar.half}
            </button>
            <button type="button" className={sheetState === 'full' ? 'active' : ''} onClick={() => setSheetState('full')}>
              {labels.sidebar.full}
            </button>
          </div>
          <button className="close-btn" onClick={onClose} aria-label={labels.sidebar.closePanel}>
            x
          </button>
        </div>
      </div>

      <div className="sidebar-content">
        <section className="info-section location-section">
          <h3>{labels.sidebar.selectedLocation}</h3>
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
              {labels.search}
            </button>
          </form>
        </section>

        <section className="info-section">
          <h3>{labels.sidebar.scoringHorizon}</h3>
          <div className="radius-control">
            <input
              type="range"
              min={300}
              max={5000}
              step={100}
              value={radiusMeters}
              onChange={(event) => onRadiusChange(Number(event.target.value))}
            />
            <div className="radius-label">{(radiusMeters / 1000).toFixed(1)} km</div>
          </div>
        </section>

        <section className="info-section">
          <h3>{labels.sidebar.accessibilityIndex}</h3>
          <div className="accessibility-index" style={{ backgroundColor: accessibilityColor }}>
            <div className="index-value">{accessibilityIndex.toFixed(0)}</div>
            <div className="index-level">{accessibilityLevelLabel.toUpperCase()}</div>
          </div>
        </section>

        <section className="info-section">
          <h3>{labels.sidebar.neighborhoodLegend}</h3>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#2ecc71' }} />
            <span>{labels.sidebar.goodAccessibility}</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#f1c40f' }} />
            <span>{labels.sidebar.mediumAccessibility}</span>
          </div>
          <div className="legend-item">
            <span className="legend-color" style={{ backgroundColor: '#e74c3c' }} />
            <span>{labels.sidebar.badAccessibility}</span>
          </div>
        </section>

        <section className="info-section">
          <h3>{labels.sidebar.servicesByWalkingTime}</h3>
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
              <div className="band-time">{labels.sidebar.beyond}</div>
              <div className="band-count">{distanceBands.beyond15min.length}</div>
            </div>
          </div>
        </section>

        <section className="info-section">
          <h3>{labels.sidebar.servicesByCategory}</h3>
          <div className="category-stats">
            {categories.map((cat) => (
              <div key={cat} className="category-item">
                <span className="category-name">{labels.categories[cat]}</span>
                <span className="category-count">{stats[cat]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="info-section full-height">
          <h3>{labels.sidebar.nearbyServices}</h3>
          <ServiceList services={services} labels={labels} />
        </section>
      </div>
    </div>
  );
};
