import React, { useEffect, useState } from 'react';
import './MobileSearch.css';

interface MobileSearchProps {
  selectedAddress: string | null;
  loading: boolean;
  onAddressSearch: (address: string) => void | Promise<void>;
}

export const MobileSearch: React.FC<MobileSearchProps> = ({
  selectedAddress,
  loading,
  onAddressSearch,
}) => {
  const [addressValue, setAddressValue] = useState('');

  useEffect(() => {
    setAddressValue(selectedAddress || '');
  }, [selectedAddress]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmedAddress = addressValue.trim();
    if (trimmedAddress) {
      onAddressSearch(trimmedAddress);
    }
  };

  return (
    <form className="mobile-search" onSubmit={handleSubmit}>
      <input
        className="mobile-search-input"
        type="text"
        value={addressValue}
        disabled={loading}
        placeholder="Search address in Katowice"
        onChange={(event) => setAddressValue(event.target.value)}
      />
      <button className="mobile-search-button" type="submit" disabled={loading || !addressValue.trim()}>
        Search
      </button>
    </form>
  );
};
