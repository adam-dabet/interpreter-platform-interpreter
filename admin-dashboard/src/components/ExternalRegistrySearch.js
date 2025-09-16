import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, UserIcon, MapPinIcon, LanguageIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ExternalRegistrySearch = ({ jobRequirements, onInterpreterSelect, onClose }) => {
  // Extract first 2 digits of ZIP code for better search results
  const getZipCodePrefix = (zipCode) => {
    if (!zipCode) return '';
    // Extract first 2 digits from ZIP code (e.g., "90210" -> "90")
    const match = zipCode.toString().match(/^(\d{2})/);
    return match ? match[1] : '';
  };

  // Check if this is for a medical certified job
  const isMedicalCertified = jobRequirements?.serviceCategory === 'Medical Certified';

  const [searchCriteria, setSearchCriteria] = useState({
    language: jobRequirements?.language || '',
    state: jobRequirements?.state || '',
    city: '', // Don't prefill city
    zipCode: getZipCodePrefix(jobRequirements?.zipCode) || '',
    certificationType: 'CHI'
  });
  
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [certificationTypes, setCertificationTypes] = useState([]);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Update search criteria when jobRequirements change
  useEffect(() => {
    if (jobRequirements) {
      setSearchCriteria({
        language: jobRequirements?.language || '',
        state: jobRequirements?.state || '',
        city: '', // Don't prefill city
        zipCode: getZipCodePrefix(jobRequirements?.zipCode) || '',
        certificationType: 'CHI'
      });
    }
  }, [jobRequirements]);

  const loadInitialData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const [languagesResponse, certificationResponse] = await Promise.all([
        fetch(`${API_BASE}/external-registry/languages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/external-registry/certification-types`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (languagesResponse.ok) {
        const languagesData = await languagesResponse.json();
        setAvailableLanguages(languagesData.data);
      }

      if (certificationResponse.ok) {
        const certificationData = await certificationResponse.json();
        setCertificationTypes(certificationData.data);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const handleSearch = async () => {
    if (!isMedicalCertified) {
      toast.error('External registry search is only available for Medical Certified jobs');
      return;
    }

    if (!searchCriteria.language || !searchCriteria.state) {
      toast.error('Language and State are required for search');
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/external-registry/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(searchCriteria)
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data);
        toast.success('CCHI search URL generated successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search external registries');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInterpreterSelect = (interpreter) => {
    onInterpreterSelect(interpreter);
    onClose();
  };

  const formatDistance = (distance) => {
    if (distance < 10) return 'Very Close';
    if (distance < 50) return 'Close';
    if (distance < 100) return 'Moderate';
    return 'Far';
  };

  const getCertificationBadgeColor = (status) => {
    switch (status) {
      case 'CHI': return 'bg-green-100 text-green-800';
      case 'CoreCHI': return 'bg-blue-100 text-blue-800';
      case 'CoreCHI-P': return 'bg-purple-100 text-purple-800';
      case 'Candidate': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">
            Search External Interpreter Registries
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search Form */}
        <div className="bg-gray-50 p-6 rounded-lg mb-6">
          {/* Medical Certified Notice */}
          {!isMedicalCertified && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-yellow-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-yellow-900">External Registry Search Not Available</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    The CCHI external registry search is only available for Medical Certified jobs. 
                    This job's service category is: {jobRequirements?.serviceCategory || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Prefilled Notice */}
          {isMedicalCertified && (jobRequirements?.language || jobRequirements?.state || jobRequirements?.zipCode) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-blue-400 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-900">Search Prefilled from Job</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Language, state, and ZIP code have been automatically filled from the job's service location. 
                    You can modify any field as needed.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <LanguageIcon className="h-4 w-4 inline mr-1" />
                Language *
              </label>
              <select
                value={searchCriteria.language}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Language</option>
                {availableLanguages.map(lang => (
                  <option key={lang.value} value={lang.value}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                State *
              </label>
              <input
                type="text"
                value={searchCriteria.state}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                placeholder="e.g., CA, NY, TX"
                maxLength="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                City
              </label>
              <input
                type="text"
                value={searchCriteria.city}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, city: e.target.value }))}
                placeholder="e.g., Los Angeles"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                ZIP Code (First 2 digits)
              </label>
              <input
                type="text"
                value={searchCriteria.zipCode}
                onChange={(e) => {
                  // Only allow 2 digits
                  const value = e.target.value.replace(/\D/g, '').slice(0, 2);
                  setSearchCriteria(prev => ({ ...prev, zipCode: value }));
                }}
                placeholder="e.g., 90"
                maxLength="2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Using first 2 digits for broader search area
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <AcademicCapIcon className="h-4 w-4 inline mr-1" />
                Certification Type
              </label>
              <select
                value={searchCriteria.certificationType}
                onChange={(e) => setSearchCriteria(prev => ({ ...prev, certificationType: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {certificationTypes.map(cert => (
                  <option key={cert.value} value={cert.value}>{cert.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleSearch}
                disabled={isLoading || !searchCriteria.language || !searchCriteria.state || !isMedicalCertified}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Searching...' : 'Search Registries'}
              </button>
            </div>
          </div>
        </div>

        {/* Search Results */}
        {searchResults.searchUrl && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-lg font-medium text-blue-900 mb-2">
                    {searchResults.instructions?.title || 'CCHI Registry Search'}
                  </h4>
                  <p className="text-blue-700 mb-4">
                    {searchResults.instructions?.message || 'Please use the provided URL to search the CCHI registry manually.'}
                  </p>
                  
                  <div className="mb-4">
                    <a
                      href={searchResults.searchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Open CCHI Registry Search
                    </a>
                  </div>

                  {searchResults.instructions?.steps && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Search Steps:</h5>
                      <ol className="list-decimal list-inside text-sm text-blue-700 space-y-1">
                        {searchResults.instructions.steps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {searchResults.instructions?.alternativeActions && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-blue-900 mb-2">Alternative Actions:</h5>
                      <ul className="list-disc list-inside text-sm text-blue-700 space-y-1">
                        {searchResults.instructions.alternativeActions.map((action, index) => (
                          <li key={index}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {searchResults.jobRequirements && (
                    <div className="bg-white rounded-lg p-3 border border-blue-200">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Search Criteria:</h5>
                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <div><strong>Language:</strong> {searchResults.jobRequirements.language}</div>
                        <div><strong>State:</strong> {searchResults.jobRequirements.state}</div>
                        {searchResults.jobRequirements.city && (
                          <div><strong>City:</strong> {searchResults.jobRequirements.city}</div>
                        )}
                        {searchResults.jobRequirements.zipCode && (
                          <div><strong>ZIP:</strong> {searchResults.jobRequirements.zipCode} (first 2 digits for broader search)</div>
                        )}
                        <div><strong>Certification:</strong> {searchResults.jobRequirements.certificationType}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {!searchResults.searchUrl && !isLoading && (
          <div className="text-center py-8 text-gray-500">
            <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Enter search criteria and click "Search Registries" to generate a CCHI search URL.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExternalRegistrySearch;
