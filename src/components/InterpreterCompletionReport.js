import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { PlusCircle, X } from 'react-feather';
import AddressAutocomplete from './AddressAutocomplete';
import toast from 'react-hot-toast';

// Determine API base URL (same logic as api.js)
const getApiBaseURL = () => {
  // If explicitly set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // In production, try to detect the backend URL based on hostname
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // If we're on providers.theintegritycompanyinc.com, backend should be at backend.theintegritycompanyinc.com
    if (hostname === 'providers.theintegritycompanyinc.com') {
      return 'https://backend.theintegritycompanyinc.com/api';
    }
    
    // If we're on admin.theintegritycompanyinc.com, backend should be at backend.theintegritycompanyinc.com
    if (hostname === 'admin.theintegritycompanyinc.com') {
      return 'https://backend.theintegritycompanyinc.com/api';
    }
    
    // If we're on portal.theintegritycompanyinc.com, backend should be at backend.theintegritycompanyinc.com
    if (hostname === 'portal.theintegritycompanyinc.com') {
      return 'https://backend.theintegritycompanyinc.com/api';
    }
    
    // If we're on a Railway domain, try to infer backend URL
    if (hostname.includes('.up.railway.app')) {
      // For Railway deployments, try to construct backend URL
      // This is a fallback - REACT_APP_API_URL should be set in Railway
      return '/api';
    }
  }
  
  // Default fallback for local development
  return '/api';
};

const API_BASE = getApiBaseURL();

const resultOptions = [
  { label: "Completed", value: "Completed" },
  { label: "Completed with follow up", value: "Completed with follow up" },
  { label: "Patient No Show", value: "Patient No Show" },
  { label: "Rescheduled", value: "Rescheduled" },
  { label: "Cancelled", value: "Cancelled" },
  { label: "Cancelled Under 24 hours", value: "Cancelled Under 24 hours" }
];

const fileStatusOptions = [
  {
    label: "Continue care with current provider/follow up provided above is with same provider",
    value: "continue_with_same"
  },
  { label: "This was a one-time assignment", value: "one_time" },
  { label: "Provider is requesting therapy", value: "requesting_therapy" },
  { label: "Follow-up with same provider pending", value: "follow_up_pending" },
  { label: "Released from care", value: "Released from care" },
  { label: "Referred to a different provider", value: "Referred to a different provider" },
  { label: "Other", value: "Other" }
];

// Time options
const hourOptions = Array.from({ length: 12 }, (_, i) => ({
  label: String(i + 1).padStart(2, "0"),
  value: String(i + 1).padStart(2, "0")
}));
const minuteOptions = Array.from({ length: 60 }, (_, i) => ({
  label: String(i).padStart(2, "0"),
  value: String(i).padStart(2, "0")
}));
const periodOptions = [
  { label: "AM", value: "AM" },
  { label: "PM", value: "PM" }
];

const getTimeString = (h, m, p) => {
  if (!h || !m || !p) return "";
  return `${h.value}:${m.value} ${p.value}`;
};

const InterpreterCompletionReport = ({ jobId, jobData, onSubmit, onCancel }) => {
  const fileInputRef = useRef(null);

  // Calculate start time based on appointment time (interpreter enters end time manually)
  const calculateStartTime = () => {
    if (!jobData?.scheduled_time) {
      return null;
    }

    // Parse the scheduled time (format: "HH:MM" or "HH:MM:SS")
    const timeParts = jobData.scheduled_time.split(':');
    const scheduledHour = parseInt(timeParts[0], 10);
    const scheduledMinute = parseInt(timeParts[1], 10);
    
    // Handle 12-hour format
    const startHour12 = scheduledHour === 0 ? 12 : scheduledHour > 12 ? scheduledHour - 12 : scheduledHour;
    
    return {
      hour: startHour12, 
      minute: scheduledMinute,
      period: scheduledHour >= 12 ? "PM" : "AM"
    };
  };

  const startTime = calculateStartTime();

  const [formData, setFormData] = useState({
    email: jobData?.assigned_interpreter_email || jobData?.interpreter_email || jobData?.email || "",
    order_number: jobData?.job_number || jobId || "",
    result: null,
    file_status: null,
    notes: ""
  });

  // Helper function to find option by value
  const findOptionByValue = (options, value) => {
    return options.find(option => option.value === value) || null;
  };

  const [startHour, setStartHour] = useState(startTime?.hour ? findOptionByValue(hourOptions, String(startTime.hour).padStart(2, "0")) : null);
  const [startMinute, setStartMinute] = useState(startTime?.minute ? findOptionByValue(minuteOptions, String(startTime.minute).padStart(2, "0")) : null);
  const [startPeriod, setStartPeriod] = useState(startTime?.period ? findOptionByValue(periodOptions, startTime.period) : null);

  const [endHour, setEndHour] = useState(null);
  const [endMinute, setEndMinute] = useState(null);
  const [endPeriod, setEndPeriod] = useState(null);

  // Update start time when jobData changes (end time is entered manually)
  useEffect(() => {
    if (startTime) {
      setStartHour(findOptionByValue(hourOptions, String(startTime.hour).padStart(2, "0")));
      setStartMinute(findOptionByValue(minuteOptions, String(startTime.minute).padStart(2, "0")));
      setStartPeriod(findOptionByValue(periodOptions, startTime.period));
    }
    // End time fields are left empty for interpreter to fill in manually
  }, [jobData?.scheduled_time]);

  // Update email when jobData changes
  useEffect(() => {
    const interpreterEmail = jobData?.assigned_interpreter_email || jobData?.interpreter_email || jobData?.email || "";
    setFormData(prev => ({
      ...prev,
      email: interpreterEmail
    }));
  }, [jobData?.assigned_interpreter_email, jobData?.interpreter_email, jobData?.email]);

  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpHour, setFollowUpHour] = useState(null);
  const [followUpMinute, setFollowUpMinute] = useState(null);
  const [followUpPeriod, setFollowUpPeriod] = useState(null);
  const [followUpLocation, setFollowUpLocation] = useState({
    street: "",
    city: "",
    state: "",
    zip: "",
    country: "United States"
  });
  const [isAvailable, setIsAvailable] = useState(null);
  const [useSameLocation, setUseSameLocation] = useState(null);

  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddressSelect = (addressData) => {
    setFollowUpLocation({
      street: addressData.street || '',
      city: addressData.city || '',
      state: addressData.state || '',
      zip: addressData.zip || '',
      country: addressData.country || 'United States'
    });
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...selectedFiles]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validation
    try {
      // 1. Validate required fields
      if (!formData.email || !formData.order_number) {
        throw new Error("Email and order number are required");
      }

      if (!formData.result) {
        throw new Error("Please select a result");
      }

      if (!formData.file_status) {
        throw new Error("Please select a file status");
      }

      // 2. Validate start and end times
      if (!startHour || !startMinute || !startPeriod) {
        throw new Error("Please select a start time");
      }

      if (!endHour || !endMinute || !endPeriod) {
        throw new Error("Please select an end time");
      }

      // 3. Validate that end time is after start time
      const startTimeString = getTimeString(startHour, startMinute, startPeriod);
      const endTimeString = getTimeString(endHour, endMinute, endPeriod);
      
      // Convert to 24-hour format for comparison
      const convertTo24Hour = (hour, period) => {
        const h = parseInt(hour.value);
        if (period.value === "AM") {
          return h === 12 ? 0 : h;
        } else {
          return h === 12 ? 12 : h + 12;
        }
      };

      const startHour24 = convertTo24Hour(startHour, startPeriod);
      const endHour24 = convertTo24Hour(endHour, endPeriod);
      const startMinutes = startHour24 * 60 + parseInt(startMinute.value);
      const endMinutes = endHour24 * 60 + parseInt(endMinute.value);

      if (endMinutes <= startMinutes) {
        throw new Error("End time must be after start time");
      }

      // 4. Validate follow-up information if "Completed with follow up" is selected
      if (formData.result?.value === "Completed with follow up") {
        // Check follow-up date
        if (!followUpDate) {
          throw new Error("Follow-up date is required");
        }

        // Validate follow-up date is not in the past
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const selectedDate = new Date(followUpDate);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate < today) {
          throw new Error("Follow-up date cannot be in the past");
        }

        // Check follow-up time
        if (!followUpHour || !followUpMinute || !followUpPeriod) {
          throw new Error("Follow-up time is required");
        }

        // Check location choice
        if (useSameLocation === null) {
          throw new Error("Please indicate if the follow-up is at the same location");
        }

        // If different location, validate location details
        if (useSameLocation === false) {
          if (!followUpLocation.street || !followUpLocation.city || !followUpLocation.state || !followUpLocation.zip) {
            throw new Error("Please provide complete follow-up location details");
          }
        }

        // Check availability
        if (isAvailable === null) {
          throw new Error("Please indicate if you are available for the follow-up");
        }
      }

      // Build form data after validation passes
      const data = new FormData();
      data.append("email", formData.email);
      data.append("order_number", formData.order_number);
      data.append("start_time", startTimeString);
      data.append("end_time", endTimeString);
      data.append("result", formData.result?.value || "");
      data.append("file_status", formData.file_status?.value || "");
      data.append("notes", formData.notes);

      if (formData.result?.value === "Completed with follow up") {
        data.append("follow_up_date", followUpDate);
        data.append("follow_up_time", getTimeString(followUpHour, followUpMinute, followUpPeriod));
        data.append("follow_up_use_same_location", useSameLocation ? "Yes" : "No");
        data.append("follow_up_street", followUpLocation.street);
        data.append("follow_up_city", followUpLocation.city);
        data.append("follow_up_state", followUpLocation.state);
        data.append("follow_up_zip", followUpLocation.zip);
        data.append("follow_up_country", followUpLocation.country);
        data.append("follow_up_available", isAvailable ? "Yes" : "No");
      }

      files.forEach((file) => data.append("documents", file));

      const token = localStorage.getItem('interpreterToken');
      const response = await fetch(`${API_BASE}/interpreters/jobs/${jobId}/completion-report`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Submission failed");
      }

      toast.success("Completion report submitted successfully!");
      
      // Reset form
      setFormData({
        email: jobData?.assigned_interpreter_email || jobData?.interpreter_email || jobData?.email || "",
        order_number: jobData?.job_number || jobId || "",
        result: null,
        file_status: null,
        notes: ""
      });
      setStartHour(null);
      setStartMinute(null);
      setStartPeriod(null);
      setEndHour(null);
      setEndMinute(null);
      setEndPeriod(null);
      setFollowUpDate("");
      setFollowUpHour(null);
      setFollowUpMinute(null);
      setFollowUpPeriod(null);
      setFollowUpLocation({ street: "", city: "", state: "", zip: "", country: "United States" });
      setIsAvailable(null);
      setUseSameLocation(null);
      setFiles([]);
      
      if (onSubmit) {
        onSubmit();
      }
    } catch (err) {
      console.error("Validation or submission error:", err);
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="relative bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X size={24} />
        </button>
        
        <form
          onSubmit={handleSubmit}
          className="p-8 space-y-6"
        >
          <div className="text-center">
            <h2 className="text-3xl font-bold text-blue-800 mb-2">
              Assignment Completion Report
            </h2>
            <p className="text-gray-500">
              Fill out the information below to submit the assignment status.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Order Number *
              </label>
              <input
                type="text"
                name="order_number"
                required
                value={formData.order_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time *
              </label>
              <div className="flex space-x-2">
                <Select
                  value={startHour}
                  onChange={setStartHour}
                  options={hourOptions}
                  placeholder="Hour"
                  className="flex-1"
                  required
                />
                <Select
                  value={startMinute}
                  onChange={setStartMinute}
                  options={minuteOptions}
                  placeholder="Min"
                  className="flex-1"
                  required
                />
                <Select
                  value={startPeriod}
                  onChange={setStartPeriod}
                  options={periodOptions}
                  placeholder="AM/PM"
                  className="flex-1"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time *
              </label>
              <div className="flex space-x-2">
                <Select
                  value={endHour}
                  onChange={setEndHour}
                  options={hourOptions}
                  placeholder="Hour"
                  className="flex-1"
                  required
                />
                <Select
                  value={endMinute}
                  onChange={setEndMinute}
                  options={minuteOptions}
                  placeholder="Min"
                  className="flex-1"
                  required
                />
                <Select
                  value={endPeriod}
                  onChange={setEndPeriod}
                  options={periodOptions}
                  placeholder="AM/PM"
                  className="flex-1"
                  required
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Actual end time. We will pay the minimum agreed rate, but need actual end time for billing purposes.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Result *
            </label>
            <Select
              value={formData.result}
              onChange={(option) => setFormData({ ...formData, result: option })}
              options={resultOptions}
              placeholder="Select result"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              File Status *
            </label>
            <Select
              value={formData.file_status}
              onChange={(option) => setFormData({ ...formData, file_status: option })}
              options={fileStatusOptions}
              placeholder="Select file status"
              required
            />
          </div>

          {formData.result?.value === "Completed with follow up" && (
            <div className="space-y-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Follow-up Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Date *
                  </label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Follow-up Time *
                  </label>
                  <div className="flex space-x-2">
                    <Select
                      value={followUpHour}
                      onChange={setFollowUpHour}
                      options={hourOptions}
                      placeholder="Hour"
                      className="flex-1"
                      required
                    />
                    <Select
                      value={followUpMinute}
                      onChange={setFollowUpMinute}
                      options={minuteOptions}
                      placeholder="Min"
                      className="flex-1"
                      required
                    />
                    <Select
                      value={followUpPeriod}
                      onChange={setFollowUpPeriod}
                      options={periodOptions}
                      placeholder="AM/PM"
                      className="flex-1"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Use Same Location? *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="useSameLocation"
                      value="yes"
                      checked={useSameLocation === true}
                      onChange={() => setUseSameLocation(true)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Yes, same location</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="useSameLocation"
                      value="no"
                      checked={useSameLocation === false}
                      onChange={() => setUseSameLocation(false)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">No, different location</span>
                  </label>
                </div>
              </div>

              {useSameLocation === false && (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700">
                    New Location Details *
                  </label>
                  <AddressAutocomplete
                    onAddressSelect={handleAddressSelect}
                    placeholder="Search for an address..."
                    className="w-full"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Street Address"
                      value={followUpLocation.street}
                      onChange={(e) => setFollowUpLocation({ ...followUpLocation, street: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="City"
                      value={followUpLocation.city}
                      onChange={(e) => setFollowUpLocation({ ...followUpLocation, city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="State"
                      value={followUpLocation.state}
                      onChange={(e) => setFollowUpLocation({ ...followUpLocation, state: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="ZIP Code"
                      value={followUpLocation.zip}
                      onChange={(e) => setFollowUpLocation({ ...followUpLocation, zip: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Country"
                      value={followUpLocation.country}
                      onChange={(e) => setFollowUpLocation({ ...followUpLocation, country: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      readOnly
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 Use the address search above to auto-fill the fields, or enter the address manually.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Are you available for this follow-up? *
                </label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isAvailable"
                      value="yes"
                      checked={isAvailable === true}
                      onChange={() => setIsAvailable(true)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Yes</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="isAvailable"
                      value="no"
                      checked={isAvailable === false}
                      onChange={() => setIsAvailable(false)}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">No</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes about the assignment..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Documents
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center w-full py-3 px-4 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors"
              >
                <PlusCircle className="h-5 w-5 mr-2 text-gray-400" />
                <span className="text-gray-600">Choose files or drag and drop</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                PDF, DOC, DOCX, JPG, JPEG, PNG up to 10MB each
              </p>
            </div>

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-700">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InterpreterCompletionReport;
