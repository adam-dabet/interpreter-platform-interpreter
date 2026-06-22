import React, { useState, useRef, useEffect } from 'react';
import { PencilIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import Button from '../../ui/Button';
import Checkbox from '../../ui/Checkbox';
import LoadingSpinner from '../../ui/LoadingSpinner';
import TransportationTermsContent from './TransportationTermsContent';
import {
  TRANSPORTATION_SERVICE_TYPES,
  TRANSPORTATION_DOCUMENT_TYPES,
  VENDOR_PORTAL_AGREEMENT_TITLE,
} from '../../../utils/constants';

const trim = (v) => (v != null && String(v).trim() !== '' ? String(v).trim() : '');

const TransportationReviewStep = ({
  data,
  onPrevious,
  onSubmit,
  isSubmitting,
  onEdit,
  parametricData,
}) => {
  const [agreements, setAgreements] = useState({
    terms_accepted: data.terms_accepted || false,
    privacy_policy_accepted: data.privacy_policy_accepted || false,
  });
  const [errors, setErrors] = useState({});
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const termsScrollRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollContainer = termsScrollRef.current;
      if (!scrollContainer) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
      if (scrollHeight - scrollTop - clientHeight < 10) {
        setHasScrolledToBottom(true);
      }
    };

    const scrollContainer = termsScrollRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      handleScroll();
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const getStateName = () => {
    if (!data.state_id || !parametricData?.usStates) return data.state_id || 'N/A';
    const state = parametricData.usStates.find(
      (s) => String(s.id) === String(data.state_id)
    );
    return state?.name || data.state_id;
  };

  const validateAgreements = () => {
    const newErrors = {};
    if (!agreements.terms_accepted) {
      newErrors.terms_accepted = `You must accept the ${VENDOR_PORTAL_AGREEMENT_TITLE}`;
    }
    if (!agreements.privacy_policy_accepted) {
      newErrors.privacy_policy_accepted = 'You must accept the privacy policy';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateW9 = () => {
    const w = data.w9_data;
    if (!w || typeof w !== 'object') {
      toast.error('Please complete the W-9 step before submitting.');
      return false;
    }
    const missing = [];
    if (!trim(w.business_name)) missing.push('business name');
    if (!w.tax_classification) missing.push('tax classification');
    if (!trim(w.ssn) && !trim(w.ein)) missing.push('SSN or EIN');
    if (!trim(w.address)) missing.push('address');
    if (!trim(w.city)) missing.push('city');
    if (!trim(w.state)) missing.push('state');
    if (!trim(w.zip_code)) missing.push('ZIP code');
    if (!trim(w.signature) && !trim(w.signature_name)) missing.push('signature');
    if (!w.electronic_signature_acknowledgment) missing.push('electronic signature acknowledgment');
    if (missing.length > 0) {
      toast.error(`Please complete the W-9 step. Missing: ${missing.join(', ')}.`);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validateW9()) return;
    if (!validateAgreements()) {
      toast.error('Please accept all required agreements');
      return;
    }
    onSubmit({ ...agreements });
  };

  const serviceTypeLabels = (data.service_types || [])
    .map((code) => TRANSPORTATION_SERVICE_TYPES.find((t) => t.value === code)?.label || code)
    .join(', ');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review & Submit</h2>
        <p className="text-gray-600">Review your application before submitting.</p>
      </div>

      <div className="space-y-4">
        <ReviewSection title="Personal Information" onEdit={() => onEdit(1)}>
          <p><strong>Name:</strong> {data.first_name} {data.last_name}</p>
          <p><strong>Business:</strong> {data.business_name}</p>
          <p><strong>Email:</strong> {data.email}</p>
          <p><strong>Phone:</strong> {data.phone}</p>
        </ReviewSection>

        <ReviewSection title="Address" onEdit={() => onEdit(2)}>
          <p>{data.street_address}{data.street_address_2 ? `, ${data.street_address_2}` : ''}</p>
          <p>{data.city}, {getStateName()} {data.zip_code}</p>
        </ReviewSection>

        <ReviewSection title="Service Types & Rates" onEdit={() => onEdit(3)}>
          <p><strong>Services:</strong> {serviceTypeLabels || 'None'}</p>
          {data.transportation_rates && Object.entries(data.transportation_rates).map(([type, rates]) => (
            <div key={type} className="mt-2 text-sm bg-gray-50 p-2 rounded">
              <p className="font-medium capitalize">{type}</p>
              <p>Per mile: ${Number(rates.per_mile).toFixed(2)}</p>
              <p>Per hour wait: ${Number(rates.per_hour_wait || 0).toFixed(2)}</p>
              {(type === 'wheelchair' || type === 'bls' || type === 'als') && (
                <p>Load fee: ${Number(rates.load_fee || 0).toFixed(2)}</p>
              )}
            </div>
          ))}
        </ReviewSection>

        <ReviewSection title="Documents" onEdit={() => onEdit(4)}>
          {TRANSPORTATION_DOCUMENT_TYPES.map((doc) => (
            <p key={doc.value}>
              <strong>{doc.label}:</strong>{' '}
              {data[`${doc.value}_file`]?.name || 'Uploaded'}
            </p>
          ))}
        </ReviewSection>

        <ReviewSection title="W-9 Information" onEdit={() => onEdit(5)}>
          {data.w9_data ? (
            <>
              <p><strong>Business:</strong> {data.w9_data.business_name}</p>
              <p><strong>Tax classification:</strong> {data.w9_data.tax_classification}</p>
              <p><strong>Tax ID:</strong> {data.w9_data.ein ? 'EIN on file' : 'SSN on file'}</p>
            </>
          ) : (
            <p className="text-red-600">W-9 not completed</p>
          )}
        </ReviewSection>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{VENDOR_PORTAL_AGREEMENT_TITLE}</h3>
        <p className="text-sm text-gray-600 mb-3">
          Please read the following agreement carefully. You must scroll to the bottom before you can accept.
        </p>

        <div
          ref={termsScrollRef}
          className="bg-white border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto text-sm text-gray-700"
          style={{ scrollbarWidth: 'thin' }}
        >
          <TransportationTermsContent />

          {!hasScrolledToBottom && (
            <div className="mt-4 p-3 bg-yellow-100 border-l-4 border-yellow-400 rounded">
              <p className="text-sm text-gray-700 font-medium">
                Please scroll to the bottom to continue.
              </p>
            </div>
          )}

          {hasScrolledToBottom && (
            <div className="mt-4 p-3 bg-green-100 border-l-4 border-green-400 rounded">
              <p className="text-sm text-gray-700 font-medium">
                ✓ You have reached the end of the agreement. You may now accept the agreement below.
              </p>
            </div>
          )}
        </div>
      </div>

      <Checkbox
        checked={agreements.terms_accepted}
        onChange={(e) => setAgreements((prev) => ({ ...prev, terms_accepted: e.target.checked }))}
        disabled={!hasScrolledToBottom}
        label={`I have read and agree to the ${VENDOR_PORTAL_AGREEMENT_TITLE}`}
        error={errors.terms_accepted}
      />

      <Checkbox
        checked={agreements.privacy_policy_accepted}
        onChange={(e) => setAgreements((prev) => ({ ...prev, privacy_policy_accepted: e.target.checked }))}
        label={
          <span>
            I agree to the{' '}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
              Privacy Policy
            </a>
          </span>
        }
        error={errors.privacy_policy_accepted}
      />

      <div className="flex justify-between pt-4">
        <Button type="button" variant="secondary" onClick={onPrevious}>
          Previous
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <LoadingSpinner size="sm" /> Submitting...
            </span>
          ) : (
            'Submit Application'
          )}
        </Button>
      </div>
    </div>
  );
};

const ReviewSection = ({ title, onEdit, children }) => (
  <div className="border rounded-lg p-4 bg-white">
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <button
        type="button"
        onClick={onEdit}
        className="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm"
      >
        <PencilIcon className="w-4 h-4" /> Edit
      </button>
    </div>
    <div className="text-sm text-gray-700 space-y-1">{children}</div>
  </div>
);

export default TransportationReviewStep;
