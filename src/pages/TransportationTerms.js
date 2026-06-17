import React from 'react';
import TransportationTermsContent from '../components/forms/transportation/TransportationTermsContent';

const TransportationTerms = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Independent Contractor Transportation Provider Agreement
        </h1>
        <TransportationTermsContent />
      </div>
    </div>
  );
};

export default TransportationTerms;
