import React, { useState, useMemo } from 'react';
import type { Service, ServiceCategory } from '../types';
import { AccessibilityCalculator } from '../utils/accessibility-calculator';
import './ServiceList.css';

interface ServiceListProps {
  services: Service[];
}

export const ServiceList: React.FC<ServiceListProps> = ({ services }) => {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'name'>('distance');

  const categories: Array<ServiceCategory | 'all'> = [
    'all',
    'shop',
    'pharmacy',
    'restaurant',
    'gym',
    'school',
    'library',
  ];

  const filteredServices = useMemo(() => {
    let filtered = services;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((s) => s.category === selectedCategory);
    }

    return filtered.sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distance || Infinity) - (b.distance || Infinity);
      } else {
        return (a.name || '').localeCompare(b.name || '');
      }
    });
  }, [services, selectedCategory, sortBy]);

  const categoryIcons: Record<ServiceCategory, string> = {
    shop: '🛍️',
    pharmacy: '💊',
    restaurant: '🍽️',
    gym: '💪',
    school: '🎓',
    library: '📚',
  };

  /* Unused in current implementation - available for future use
  const categoryColors: Record<ServiceCategory, string> = {
    shop: '#3498db',
    pharmacy: '#e74c3c',
    restaurant: '#f39c12',
    gym: '#27ae60',
    school: '#9b59b6',
    library: '#16a085',
  };
  */

  return (
    <div className="service-list-container">
      {/* Filters */}
      <div className="service-filters">
        <div className="filter-group">
          <label>Category:</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ServiceCategory | 'all')}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Services' : cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'distance' | 'name')}>
            <option value="distance">Distance</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Services List */}
      {filteredServices.length === 0 ? (
        <div className="no-services">
          <p>No services found in this category</p>
        </div>
      ) : (
        <div className="services-list">
          {filteredServices.map((service) => {
            const distanceBand =
              service.distance && service.distance <= 420
                ? '5min'
                : service.distance && service.distance <= 840
                  ? '10min'
                  : service.distance && service.distance <= 1260
                    ? '15min'
                    : 'beyond';

            return (
              <div key={service.id} className="service-item">
                <div className="service-item-header">
                  <div className="service-info">
                    <span className="service-icon">{categoryIcons[service.category]}</span>
                    <div className="service-details">
                      <div className="service-name">{service.name}</div>
                      {service.address && (
                        <div className="service-address">{service.address}</div>
                      )}
                    </div>
                  </div>
                  <div className="service-distance">
                    <div className="distance-badge">
                      {AccessibilityCalculator.formatDistance(service.distance)}
                    </div>
                    <div className="duration-badge">{AccessibilityCalculator.formatDuration(service.duration)}</div>
                  </div>
                </div>
                <div
                  className={`distance-band-indicator band-${distanceBand}`}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
