import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { formatTransportationServiceType } from '../utils/providerUtils';
import { TRANSPORTATION_DOCUMENT_TYPES } from '../utils/constants';

const Section = ({ title, children }) => (
  <div className="bg-white rounded-lg border p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
    {children}
  </div>
);

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-gray-500 uppercase">{label}</p>
    <p className="text-gray-900 mt-1">{value || '—'}</p>
  </div>
);

const TransportationProfile = () => {
  const { profile, isLoading } = useAuth();

  if (isLoading || !profile) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  let rates = profile.transportation_rates;
  if (typeof rates === 'string') {
    try {
      rates = JSON.parse(rates);
    } catch {
      rates = {};
    }
  }

  const w9 = profile.w9_forms?.[0];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-1">Your transportation provider account information.</p>
        {profile.profile_status && profile.profile_status !== 'approved' && (
          <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">
            Account status: {profile.profile_status.replace(/_/g, ' ')}
          </p>
        )}
      </div>

      <Section title="Business & Contact">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name" value={profile.business_name} />
          <Field label="Contact Name" value={`${profile.first_name} ${profile.last_name}`} />
          <Field label="Email" value={profile.email} />
          <Field label="Phone" value={profile.phone} />
        </div>
      </Section>

      <Section title="Address">
        <div className="space-y-2 text-gray-900">
          <p>{profile.street_address}{profile.street_address_2 ? `, ${profile.street_address_2}` : ''}</p>
          <p>
            {profile.city}{profile.state_name ? `, ${profile.state_name}` : ''} {profile.zip_code}
          </p>
          {profile.formatted_address && (
            <p className="text-sm text-gray-500">{profile.formatted_address}</p>
          )}
        </div>
      </Section>

      <Section title="Service Types & Rates">
        {rates && Object.keys(rates).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(rates).map(([type, rate]) => (
              <div key={type} className="bg-gray-50 rounded-lg p-4">
                <p className="font-medium text-gray-900">{formatTransportationServiceType(type)}</p>
                <p className="text-sm text-gray-700 mt-1">
                  Per mile: ${Number(rate.per_mile || 0).toFixed(2)}
                </p>
                <p className="text-sm text-gray-700">
                  Per hour wait: ${Number(rate.per_hour_wait || 0).toFixed(2)}
                </p>
                {(type === 'wheelchair' || type === 'bls' || type === 'als') && (
                  <p className="text-sm text-gray-700">
                    Load fee: ${Number(rate.load_fee || 0).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No service rates on file.</p>
        )}
      </Section>

      <Section title="Documents">
        {profile.provider_documents?.length > 0 ? (
          <ul className="space-y-2">
            {profile.provider_documents.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div>
                  <p className="font-medium text-gray-900">{doc.document_name}</p>
                  <p className="text-xs text-gray-500">{doc.original_filename}</p>
                </div>
                {doc.file_url && (
                  <a
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-teal-600 hover:underline"
                  >
                    View
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">
            No documents on file. Required documents:{' '}
            {TRANSPORTATION_DOCUMENT_TYPES.map((d) => d.label).join(', ')}.
          </p>
        )}
      </Section>

      {w9 && (
        <Section title="W-9 Information">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Business Name (W-9)" value={w9.business_name} />
            <Field label="Tax Classification" value={w9.tax_classification} />
            <Field label="Tax ID" value={w9.ein ? 'EIN on file' : w9.ssn ? 'SSN on file' : '—'} />
            <Field
              label="Address"
              value={w9.address ? `${w9.address}, ${w9.city}, ${w9.state} ${w9.zip_code}` : null}
            />
          </div>
        </Section>
      )}

      <p className="text-sm text-gray-500 text-center">
        To update your profile information, please contact{' '}
        <a href="mailto:providers@theintegritycompanyinc.com" className="text-teal-600 underline">
          providers@theintegritycompanyinc.com
        </a>
        .
      </p>
    </div>
  );
};

export default TransportationProfile;
