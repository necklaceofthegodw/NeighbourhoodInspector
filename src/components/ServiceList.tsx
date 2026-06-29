import React, { memo, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Translation } from '../i18n';
import type { Service, ServiceCategory } from '../types';
import './ServiceList.css';

interface ServiceListProps {
  services: Service[];
  labels: Translation;
}

const CATEGORIES: Array<ServiceCategory | 'all'> = [
  'all',
  'shop',
  'pharmacy',
  'restaurant',
  'gym',
  'school',
  'library',
];

const CATEGORY_ICONS: Record<ServiceCategory, string> = {
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
  const listRef = useRef<HTMLDivElement | null>(null);

  const filteredServices = useMemo(() => {
    const filtered =
      selectedCategory === 'all'
        ? [...services]
        : services.filter((service) => service.category === selectedCategory);

    return filtered.sort((a, b) => {
      if (sortBy === 'distance') {
        return (a.distance ?? Infinity) - (b.distance ?? Infinity);
      }

      return (a.name || '').localeCompare(b.name || '');
    });
  }, [services, selectedCategory, sortBy]);

  const rowVirtualizer = useVirtualizer({
    count: filteredServices.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 86,
    overscan: 8,
    useFlushSync: false,
  });

  return (
    <div className="service-list-container">
      <div className="service-filters">
        <div className="filter-group">
          <label>{labels.serviceList.category}</label>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value as ServiceCategory | 'all')}
          >
            {CATEGORIES.map((category) => (
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
        <div ref={listRef} className="services-list">
          <div
            className="services-list-virtual-spacer"
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const service = filteredServices[virtualRow.index];

              return (
                <div
                  key={service.id}
                  className="service-virtual-row"
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <ServiceItem service={service} labels={labels} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceItem = memo(function ServiceItem({
  service,
  labels,
}: {
  service: Service;
  labels: Translation;
}) {
  const categoryLabel = labels.categories[service.category];

  return (
    <div className="service-item">
      <div className="service-item-header">
        <div className="service-info">
          <span className="service-icon" aria-label={categoryLabel}>
            {CATEGORY_ICONS[service.category]}
          </span>
          <div className="service-details">
            <div className="service-name">{service.name}</div>
            {service.address && <div className="service-address">{service.address}</div>}
          </div>
        </div>
        <div className="service-distance">
          <div className="distance-badge">{formatDistance(service.distance, labels)}</div>
          <div className="duration-badge">{formatDuration(service.duration, labels)}</div>
        </div>
      </div>
      <div className={`distance-band-indicator band-${getDistanceBand(service.distance)}`} />
    </div>
  );
});

function formatDistance(meters: number | undefined, labels: Translation): string {
  if (meters === undefined) return labels.serviceList.notAvailable;
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number | undefined, labels: Translation): string {
  if (seconds === undefined) return labels.serviceList.notAvailable;
  const minutes = Math.round(seconds / 60);
  if (minutes === 0) return labels.serviceList.lessThanOneMinute;
  return `${minutes} min`;
}

function getDistanceBand(distance: number | undefined): '5min' | '10min' | '15min' | 'beyond' {
  if (distance !== undefined && distance <= 420) {
    return '5min';
  }

  if (distance !== undefined && distance <= 840) {
    return '10min';
  }

  if (distance !== undefined && distance <= 1260) {
    return '15min';
  }

  return 'beyond';
}
