import React, { useState, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import toast from 'react-hot-toast';
import {
  TRANSPORTATION_SERVICE_TYPES,
  TRANSPORTATION_PREFERRED_RATES,
} from '../../../utils/constants';

const TransportationServiceTypesStep = ({
  formData,
  onNext,
  onPrevious,
  isFirstStep,
  isEditing,
  onUpdate,
  rejectedFields = [],
}) => {
  const [selectedTypes, setSelectedTypes] = useState(formData.service_types || []);
  const [rates, setRates] = useState(formData.transportation_rates || {});
  const [errors, setErrors] = useState({});

  const isFieldRejected = (fieldName) => rejectedFields.includes(fieldName);

  useEffect(() => {
    const explicitTypes = Array.isArray(formData.service_types) ? formData.service_types : [];
    setSelectedTypes(explicitTypes);

    if (explicitTypes.length > 0 && formData.transportation_rates) {
      const filteredRates = {};
      explicitTypes.forEach((type) => {
        if (formData.transportation_rates[type]) {
          filteredRates[type] = formData.transportation_rates[type];
        }
      });
      setRates(filteredRates);
    } else if (explicitTypes.length === 0) {
      setRates({});
    }
  }, [formData.service_types, formData.transportation_rates]);

  const toggleServiceType = (value) => {
    setSelectedTypes((prev) => {
      const next = prev.includes(value)
        ? prev.filter((t) => t !== value)
        : [...prev, value];

      setRates((currentRates) => {
        const updated = { ...currentRates };
        if (!next.includes(value)) {
          delete updated[value];
          return updated;
        }
        if (!updated[value]) {
          if (value === 'ambulatory' || value === 'wheelchair') {
            updated[value] = {
              per_mile: '',
              rate_type: '',
            };
          } else {
            updated[value] = {
              per_mile: '',
              per_hour_wait: '',
              load_fee: '',
              rate_type: 'custom',
            };
          }
        }
        return updated;
      });

      return next;
    });
  };

  const setPlatformRate = (serviceType) => {
    setRates((prev) => ({
      ...prev,
      [serviceType]: {
        per_mile: String(TRANSPORTATION_PREFERRED_RATES[serviceType]),
        rate_type: 'platform',
      },
    }));
  };

  const setCustomRate = (serviceType) => {
    setRates((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        rate_type: 'custom',
      },
    }));
  };

  const updateRateField = (serviceType, field, value) => {
    setRates((prev) => ({
      ...prev,
      [serviceType]: {
        ...prev[serviceType],
        [field]: value,
        rate_type: prev[serviceType]?.rate_type || 'custom',
      },
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (selectedTypes.length === 0) {
      newErrors.service_types = 'Select at least one service type';
    }

    selectedTypes.forEach((type) => {
      const typeRates = rates[type] || {};
      if (type === 'ambulatory' || type === 'wheelchair') {
        const perMile = parseFloat(typeRates.per_mile);
        if (Number.isNaN(perMile) || perMile <= 0) {
          newErrors[`${type}_per_mile`] = 'Per mile rate is required';
        }
      } else {
        const perMile = parseFloat(typeRates.per_mile);
        const perHourWait = parseFloat(typeRates.per_hour_wait);
        const loadFee = parseFloat(typeRates.load_fee);
        if (Number.isNaN(perMile) || perMile <= 0) {
          newErrors[`${type}_per_mile`] = 'Per mile rate is required';
        }
        if (Number.isNaN(perHourWait) || perHourWait < 0) {
          newErrors[`${type}_per_hour_wait`] = 'Per hour wait rate is required';
        }
        if (Number.isNaN(loadFee) || loadFee < 0) {
          newErrors[`${type}_load_fee`] = 'Load fee is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validate()) {
      toast.error('Please complete all required rate fields');
      return;
    }

    const transportation_rates = {};
    selectedTypes.forEach((type) => {
      const typeRates = rates[type] || {};
      if (type === 'ambulatory' || type === 'wheelchair') {
        transportation_rates[type] = {
          per_mile: parseFloat(typeRates.per_mile),
          per_hour_wait: 0,
          load_fee: 0,
          rate_type: typeRates.rate_type || 'custom',
        };
      } else {
        transportation_rates[type] = {
          per_mile: parseFloat(typeRates.per_mile),
          per_hour_wait: parseFloat(typeRates.per_hour_wait),
          load_fee: parseFloat(typeRates.load_fee),
          rate_type: 'custom',
        };
      }
    });

    const payload = { service_types: selectedTypes, transportation_rates };
    onUpdate(payload);
    onNext(payload);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Types & Rates</h2>
        <p className="text-gray-600">
          Tap each service type you offer, then set your rates. None are selected by default.
        </p>
      </div>

      <div
        className={`space-y-3 ${isFieldRejected('service_types') ? 'ring-2 ring-red-500 rounded-lg p-3 bg-red-50' : ''}`}
      >
        {TRANSPORTATION_SERVICE_TYPES.map((serviceType) => {
          const isSelected = selectedTypes.includes(serviceType.value);
          return (
            <div key={serviceType.value} className="border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleServiceType(serviceType.value)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{serviceType.label}</p>
                  <p className="text-sm text-gray-500">{serviceType.description}</p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                </div>
              </button>

              {isSelected && (serviceType.value === 'ambulatory' || serviceType.value === 'wheelchair') && (
                <div className="p-4 border-t bg-gray-50 space-y-4">
                  <p className="text-sm text-gray-600">
                    Preferred platform rate: ${TRANSPORTATION_PREFERRED_RATES[serviceType.value].toFixed(2)} per mile
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={rates[serviceType.value]?.rate_type === 'platform' ? 'primary' : 'secondary'}
                      onClick={() => setPlatformRate(serviceType.value)}
                    >
                      Accept preferred rate
                    </Button>
                    <Button
                      type="button"
                      variant={rates[serviceType.value]?.rate_type === 'custom' ? 'primary' : 'secondary'}
                      onClick={() => setCustomRate(serviceType.value)}
                    >
                      Enter custom rate
                    </Button>
                  </div>
                  <Input
                    label="Per Mile Rate ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rates[serviceType.value]?.per_mile || ''}
                    onChange={(e) => updateRateField(serviceType.value, 'per_mile', e.target.value)}
                    error={errors[`${serviceType.value}_per_mile`]}
                  />
                </div>
              )}

              {isSelected && (serviceType.value === 'bls' || serviceType.value === 'als') && (
                <div className="p-4 border-t bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Per Mile Rate ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rates[serviceType.value]?.per_mile || ''}
                    onChange={(e) => updateRateField(serviceType.value, 'per_mile', e.target.value)}
                    error={errors[`${serviceType.value}_per_mile`]}
                  />
                  <Input
                    label="Per Hour Wait ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rates[serviceType.value]?.per_hour_wait || ''}
                    onChange={(e) => updateRateField(serviceType.value, 'per_hour_wait', e.target.value)}
                    error={errors[`${serviceType.value}_per_hour_wait`]}
                  />
                  <Input
                    label="Load Fee ($)"
                    type="number"
                    step="0.01"
                    min="0"
                    value={rates[serviceType.value]?.load_fee || ''}
                    onChange={(e) => updateRateField(serviceType.value, 'load_fee', e.target.value)}
                    error={errors[`${serviceType.value}_load_fee`]}
                  />
                </div>
              )}
            </div>
          );
        })}
        {errors.service_types && (
          <p className="text-sm text-red-600">{errors.service_types}</p>
        )}
      </div>

      <div className="flex justify-between pt-4">
        {!isFirstStep && (
          <Button type="button" variant="secondary" onClick={onPrevious}>
            Previous
          </Button>
        )}
        <Button type="button" onClick={handleNext} className={isFirstStep ? 'ml-auto' : ''}>
          {isEditing ? 'Save Changes' : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default TransportationServiceTypesStep;
