export const isTransportationProvider = (profile) =>
  profile?.provider_type === 'transportation' || profile?.providerType === 'transportation';

export const formatTransportationServiceType = (type) => {
  if (!type) return 'N/A';
  const labels = {
    ambulatory: 'Ambulatory',
    wheelchair: 'Wheelchair',
    bls: 'BLS',
    als: 'ALS',
  };
  return labels[type.toLowerCase()] || type;
};

export const formatTripStatus = (status) => {
  if (!status) return 'Unknown';
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
};
