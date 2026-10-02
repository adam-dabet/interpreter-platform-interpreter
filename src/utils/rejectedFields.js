export function parseRejectedFields(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function getRejectedFieldStep(field) {
  if ([
    'first_name',
    'last_name',
    'middle_name',
    'email',
    'phone',
    'date_of_birth',
    'business_name',
    'gender',
  ].includes(field)) {
    return 1;
  }
  if (['street_address', 'street_address_2', 'city', 'state_id', 'zip_code', 'county'].includes(field)) {
    return 2;
  }
  if (field === 'languages') return 3;
  if (field === 'certificates') return 4;
  if (field === 'service_types' || String(field).startsWith('service_rate_')) return 5;
  if (field === 'w9_data' || String(field).startsWith('w9_')) return 6;
  return 1;
}

export function getResubmissionWizardStepIds(rejectedFields, reviewStepId = 7) {
  const ids = [...new Set((rejectedFields || []).map(getRejectedFieldStep))]
    .filter((id) => id > 0)
    .sort((a, b) => a - b);
  if (!ids.includes(reviewStepId)) {
    ids.push(reviewStepId);
  }
  return ids;
}

export function getRejectedServiceTypeId(field) {
  if (!field || !String(field).startsWith('service_rate_')) return null;
  return String(field).replace(/^service_rate_/, '');
}

export function isRejectedServiceRate(rejectedFields, serviceTypeId) {
  const id = String(serviceTypeId);
  return (rejectedFields || []).some((field) => getRejectedServiceTypeId(field) === id);
}

export function formatRejectedFieldLabel(field, serviceTypes = [], serviceRates = []) {
  if (!field) return '';
  const labels = {
    first_name: 'First Name',
    last_name: 'Last Name',
    email: 'Email',
    phone: 'Phone Number',
    date_of_birth: 'Date of Birth',
    street_address: 'Street Address',
    city: 'City',
    state_id: 'State',
    zip_code: 'ZIP Code',
    languages: 'Languages',
    service_types: 'Service Types',
    certificates: 'Certificates',
    w9_data: 'W-9 Form',
    w9_business_info: 'W-9 Business Information',
    w9_tax_info: 'W-9 Tax Classification',
    w9_tax_id: 'W-9 Tax ID (SSN/EIN)',
    w9_address: 'W-9 Address',
  };
  if (labels[field]) return labels[field];

  const rateId = getRejectedServiceTypeId(field);
  if (rateId) {
    const fromParametric = (serviceTypes || []).find((st) => String(st.id) === rateId);
    const fromRates = (serviceRates || []).find((r) => String(r.service_type_id) === rateId);
    const name = fromParametric?.name || fromRates?.service_type_name;
    return name ? `${name} Rate` : 'Service Rate';
  }

  return String(field).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function didServiceRateChange(originalRate, newRate) {
  if (!originalRate && newRate) return true;
  if (originalRate && !newRate) return true;
  if (!originalRate && !newRate) return false;

  const typeA = originalRate.rate_type || 'custom';
  const typeB = newRate.rate_type || 'custom';
  const amountA = parseFloat(originalRate.rate_amount);
  const amountB = parseFloat(newRate.rate_amount);
  const unitA = String(originalRate.rate_unit || '').toLowerCase();
  const unitB = String(newRate.rate_unit || '').toLowerCase();

  return (
    typeA !== typeB ||
    Math.abs((amountA || 0) - (amountB || 0)) > 0.01 ||
    unitA !== unitB
  );
}
