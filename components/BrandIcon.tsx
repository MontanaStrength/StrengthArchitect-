import React from 'react';

interface Props {
  size?: number;
  className?: string;
}

/**
 * Custom Strength Architect brand icon.
 * A geometric barbell with architectural precision lines —
 * angular plates, clean bar, subtle blueprint aesthetic.
 */
const BrandIcon: React.FC<Props> = ({ size = 20, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Bar — the backbone */}
    <rect x="2" y="11" width="20" height="2" rx="1" fill="currentColor" />

    {/* Left outer plate — heavy, angular */}
    <rect x="3" y="5.5" width="2.5" height="13" rx="0.75" fill="currentColor" />

    {/* Left inner plate — thinner accent */}
    <rect x="6.5" y="7.5" width="2" height="9" rx="0.5" fill="currentColor" opacity="0.7" />

    {/* Right outer plate */}
    <rect x="18.5" y="5.5" width="2.5" height="13" rx="0.75" fill="currentColor" />

    {/* Right inner plate */}
    <rect x="15.5" y="7.5" width="2" height="9" rx="0.5" fill="currentColor" opacity="0.7" />

    {/* Center knurl marks — architectural detail */}
    <rect x="10.5" y="10" width="0.5" height="4" rx="0.25" fill="currentColor" opacity="0.35" />
    <rect x="11.75" y="10" width="0.5" height="4" rx="0.25" fill="currentColor" opacity="0.35" />
    <rect x="13" y="10" width="0.5" height="4" rx="0.25" fill="currentColor" opacity="0.35" />

    {/* Collar lines */}
    <rect x="9" y="9.5" width="0.75" height="5" rx="0.25" fill="currentColor" opacity="0.5" />
    <rect x="14.25" y="9.5" width="0.75" height="5" rx="0.25" fill="currentColor" opacity="0.5" />
  </svg>
);

export default BrandIcon;
