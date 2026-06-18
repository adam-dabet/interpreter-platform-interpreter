import React from 'react';
import TransportationTermsContent from '../components/forms/transportation/TransportationTermsContent';
import { VENDOR_PORTAL_AGREEMENT_TITLE } from '../utils/constants';

const TransportationTerms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <div
          className="max-h-[80vh] overflow-y-auto text-sm text-gray-700 pr-2"
          style={{ scrollbarWidth: 'thin' }}
        >
          <TransportationTermsContent />
        </div>
      </div>
    </div>
  );
};

export default TransportationTerms;
