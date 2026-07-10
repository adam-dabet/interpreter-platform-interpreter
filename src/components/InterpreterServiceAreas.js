import React, { useState, useEffect } from 'react';
import { MapPinIcon, PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import AddressAutocomplete from './AddressAutocomplete';
import { interpreterAPI } from '../services/api';

const US_STATES = [
  { value: 1, label: 'Alabama', code: 'AL' }, { value: 2, label: 'Alaska', code: 'AK' }, { value: 3, label: 'Arizona', code: 'AZ' },
  { value: 4, label: 'Arkansas', code: 'AR' }, { value: 5, label: 'California', code: 'CA' }, { value: 6, label: 'Colorado', code: 'CO' },
  { value: 7, label: 'Connecticut', code: 'CT' }, { value: 8, label: 'Delaware', code: 'DE' }, { value: 9, label: 'Florida', code: 'FL' },
  { value: 10, label: 'Georgia', code: 'GA' }, { value: 11, label: 'Hawaii', code: 'HI' }, { value: 12, label: 'Idaho', code: 'ID' },
  { value: 13, label: 'Illinois', code: 'IL' }, { value: 14, label: 'Indiana', code: 'IN' }, { value: 15, label: 'Iowa', code: 'IA' },
  { value: 16, label: 'Kansas', code: 'KS' }, { value: 17, label: 'Kentucky', code: 'KY' }, { value: 18, label: 'Louisiana', code: 'LA' },
  { value: 19, label: 'Maine', code: 'ME' }, { value: 20, label: 'Maryland', code: 'MD' }, { value: 21, label: 'Massachusetts', code: 'MA' },
  { value: 22, label: 'Michigan', code: 'MI' }, { value: 23, label: 'Minnesota', code: 'MN' }, { value: 24, label: 'Mississippi', code: 'MS' },
  { value: 25, label: 'Missouri', code: 'MO' }, { value: 26, label: 'Montana', code: 'MT' }, { value: 27, label: 'Nebraska', code: 'NE' },
  { value: 28, label: 'Nevada', code: 'NV' }, { value: 29, label: 'New Hampshire', code: 'NH' }, { value: 30, label: 'New Jersey', code: 'NJ' },
  { value: 31, label: 'New Mexico', code: 'NM' }, { value: 32, label: 'New York', code: 'NY' }, { value: 33, label: 'North Carolina', code: 'NC' },
  { value: 34, label: 'North Dakota', code: 'ND' }, { value: 35, label: 'Ohio', code: 'OH' }, { value: 36, label: 'Oklahoma', code: 'OK' },
  { value: 37, label: 'Oregon', code: 'OR' }, { value: 38, label: 'Pennsylvania', code: 'PA' }, { value: 39, label: 'Rhode Island', code: 'RI' },
  { value: 40, label: 'South Carolina', code: 'SC' }, { value: 41, label: 'South Dakota', code: 'SD' }, { value: 42, label: 'Tennessee', code: 'TN' },
  { value: 43, label: 'Texas', code: 'TX' }, { value: 44, label: 'Utah', code: 'UT' }, { value: 45, label: 'Vermont', code: 'VT' },
  { value: 46, label: 'Virginia', code: 'VA' }, { value: 47, label: 'Washington', code: 'WA' }, { value: 48, label: 'West Virginia', code: 'WV' },
  { value: 49, label: 'Wisconsin', code: 'WI' }, { value: 50, label: 'Wyoming', code: 'WY' },
];

const emptyForm = {
  label: '',
  street_address: '',
  street_address_2: '',
  city: '',
  state_id: '',
  zip_code: '',
  service_radius_miles: 25,
  latitude: null,
  longitude: null,
  formatted_address: '',
  place_id: '',
};

const formatAreaAddress = (area) => {
  const parts = [
    area.street_address,
    area.street_address_2,
    [area.city, area.state_name || area.state_code].filter(Boolean).join(', '),
    area.zip_code,
  ].filter(Boolean);
  return parts.join(', ') || area.formatted_address || 'Address not set';
};

const InterpreterServiceAreas = ({ initialAreas = [], onAreasChange }) => {
  const [areas, setAreas] = useState(initialAreas);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAreas(initialAreas);
  }, [initialAreas]);

  const loadAreas = async () => {
    setLoading(true);
    try {
      const response = await interpreterAPI.getServiceAreas();
      const list = response.data?.data || [];
      setAreas(list);
      onAreasChange?.(list);
    } catch (error) {
      console.error('Error loading service areas:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAreas();
  }, []);

  const handleAddressSelect = (addressData) => {
    let stateId = '';
    if (addressData.state) {
      const stateMatch = US_STATES.find(
        (s) =>
          s.code === addressData.state.toUpperCase() ||
          s.label.toLowerCase() === addressData.state.toLowerCase()
      );
      if (stateMatch) stateId = stateMatch.value;
    }

    setFormData((prev) => ({
      ...prev,
      street_address: addressData.street || addressData.formatted_address || prev.street_address,
      city: addressData.city || prev.city,
      state_id: stateId || prev.state_id,
      zip_code: addressData.zip || prev.zip_code,
      latitude: addressData.latitude ? Number(addressData.latitude) : prev.latitude,
      longitude: addressData.longitude ? Number(addressData.longitude) : prev.longitude,
      formatted_address: addressData.formatted_address || prev.formatted_address,
      place_id: addressData.place_id || prev.place_id,
    }));
    toast.success('Address geocoded');
  };

  const openAddModal = () => {
    setEditingArea(null);
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (area) => {
    setEditingArea(area);
    setFormData({
      label: area.label || '',
      street_address: area.street_address || '',
      street_address_2: area.street_address_2 || '',
      city: area.city || '',
      state_id: area.state_id || '',
      zip_code: area.zip_code || '',
      service_radius_miles: area.service_radius_miles || 25,
      latitude: area.latitude,
      longitude: area.longitude,
      formatted_address: area.formatted_address || '',
      place_id: area.place_id || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.street_address && !formData.city) {
      toast.error('Please enter an address');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        state_id: formData.state_id || null,
        service_radius_miles: parseInt(formData.service_radius_miles, 10) || 25,
      };

      if (editingArea) {
        await interpreterAPI.updateServiceArea(editingArea.id, payload);
        toast.success('Service area updated');
      } else {
        await interpreterAPI.createServiceArea(payload);
        toast.success('Service area added');
      }

      setShowModal(false);
      loadAreas();
    } catch (error) {
      console.error('Error saving service area:', error);
      toast.error(error.response?.data?.message || 'Failed to save service area');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (areaId) => {
    if (!window.confirm('Remove this service area? You will no longer receive offers for jobs in this region.')) {
      return;
    }

    try {
      await interpreterAPI.deleteServiceArea(areaId);
      toast.success('Service area removed');
      loadAreas();
    } catch (error) {
      console.error('Error deleting service area:', error);
      toast.error(error.response?.data?.message || 'Failed to remove service area');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5 text-teal-600" />
            Additional Service Areas
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Add addresses for regions you cover beyond your primary address. You will receive job offers when appointments fall within the radius of any listed area.
          </p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          Add Area
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading service areas...</p>
      ) : areas.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No additional service areas yet.</p>
      ) : (
        <div className="space-y-3">
          {areas.map((area) => (
            <div
              key={area.id}
              className="flex items-start justify-between p-4 border border-gray-200 rounded-lg bg-gray-50"
            >
              <div>
                {area.label && <p className="font-semibold text-gray-900">{area.label}</p>}
                <p className="text-sm text-gray-700">{formatAreaAddress(area)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Radius: {area.service_radius_miles || 25} miles
                </p>
              </div>
              <div className="flex gap-2 ml-4">
                <button type="button" onClick={() => openEditModal(area)} className="p-2 text-gray-500 hover:text-teal-600">
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => handleDelete(area.id)} className="p-2 text-gray-500 hover:text-red-600">
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingArea ? 'Edit Service Area' : 'Add Service Area'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label (optional)</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData((p) => ({ ...p, label: e.target.value }))}
                  placeholder="e.g. San Diego Office"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  placeholder="Search for an address"
                  initialValue={formData.street_address || formData.formatted_address || ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apt / Suite (optional)</label>
                <input
                  type="text"
                  value={formData.street_address_2}
                  onChange={(e) => setFormData((p) => ({ ...p, street_address_2: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <select
                    value={formData.state_id}
                    onChange={(e) => setFormData((p) => ({ ...p, state_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select</option>
                    {US_STATES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => setFormData((p) => ({ ...p, zip_code: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Radius (miles)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={formData.service_radius_miles}
                  onChange={(e) => setFormData((p) => ({ ...p, service_radius_miles: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingArea ? 'Update' : 'Add Area'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InterpreterServiceAreas;
