import React, { useMemo, useState } from 'react';
import type { Translation } from '../i18n';
import type { Service, ServiceCategory } from '../types';
import './ServiceList.css';

interface ServiceListProps {
  services: Service[];
  labels: Translation;
}

const categories: Array<ServiceCategory | 'all'> = [
  'all',
  'shop',
  'pharmacy',
  'restaurant',
  'gym',
  'school',
  'library',
];

const categoryIcons: Record<ServiceCategory, string> = {
  shop: '🛍️',
  pharmacy: '💊',
  restaurant: '🍽️',
  gym: '💪',
  school: '🎓',
  library: '📚',
};

export const ServiceList: React.FC<ServiceListProps> = ({ services, labels }) => {
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'name'>('distance');

  const filteredServices = useMemo(() => {
    const filtered =
      selectedCategory === 'all'
        ? [...services]
        : services.filter((service) => service.category === selectedCategory);

    return filtered.sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distance || Infinity) - (b.distance || Infinity);
      }

      return (a.name || '').localeCompare(b.name || '');
    });
  }, [services, selectedCategory, sortBy]);

  const formatDistance = (meters: number | undefined): string => {
    if (meters === undefined) return labels.serviceList.notAvailable;
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }

    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatDuration = (seconds: number | undefined): string => {
    if (seconds === undefined) return labels.serviceList.notAvailable;
    const minutes = Math.round(seconds / 60);
    if (minutes === 0) return labels.serviceList.lessThanOneMinute;
    return `${minutes} min`;
  };

  return (
    <div className="service-list-container">
      <div className="service-filters">
        <div className="filter-group">
          <label>{labels.serviceList.category}</label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value as ServiceCategory | 'all')}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? labels.serviceList.allServices : labels.categories[category]}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>{labels.serviceList.sortBy}</label>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'distance' | 'name')}>
            <option value="distance">{labels.serviceList.distance}</option>
            <option value="name">{labels.serviceList.name}</option>
          </select>
        </div>
      </div>

      {filteredServices.length === 0 ? (
        <div className="no-services">
          <p>{labels.serviceList.noServices}</p>
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
            const categoryLabel = labels.categories[service.category];

            return (
              <div key={service.id} className="service-item">
                <div className="service-item-header">
                  <div className="service-info">
                    <span
                      className="service-icon"
                      aria-label={categoryLabel}
                    >
                      {categoryIcons[service.category]}
                    </span>
                    <div className="service-details">
                      <div className="service-name">{service.name}</div>
                      {service.address && <div className="service-address">{service.address}</div>}
                    </div>
                  </div>
                  <div className="service-distance">
                    <div className="distance-badge">{formatDistance(service.distance)}</div>
                    <div className="duration-badge">{formatDuration(service.duration)}</div>
                  </div>
                </div>
                <div className={`distance-band-indicator band-${distanceBand}`} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
