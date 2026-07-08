import React from 'react'

// Simple, no-API-key Google Maps embed. Pass either a human-readable
// address ("123 Hotel Street, Addis Ababa") or "lat,lng" coordinates -
// both work with Google's query-based embed URL.
const MapEmbed = ({ query, height = '320px', className = '' }) => {
  if (!query) return null;

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;

  return (
    <iframe
      title='Hotel Location'
      src={src}
      width='100%'
      height={height}
      style={{ border: 0 }}
      allowFullScreen=''
      loading='lazy'
      referrerPolicy='no-referrer-when-downgrade'
      className={`rounded-xl shadow-lg ${className}`}
    />
  );
};

export default MapEmbed