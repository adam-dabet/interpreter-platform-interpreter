import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { PlusCircle, X } from 'react-feather';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

  // Debug: Log the jobData to see what's available
  console.log('InterpreterCompletionReport jobData:', jobData);

  // Calculate start and end times based on appointment time and actual duration
  const calculateTimes = () => {
    console.log('calculateTimes - scheduled_time:', jobData?.scheduled_time);
    console.log('calculateTimes - actual_duration_minutes:', jobData?.actual_duration_minutes);
    console.log('calculateTimes - estimated_duration_minutes:', jobData?.estimated_duration_minutes);
    
    if (!jobData?.scheduled_time) {
      console.log('No scheduled_time found');
      return { startTime: null, endTime: null };
    }

    // Parse the scheduled time (format: "HH:MM" or "HH:MM:SS")
    const timeParts = jobData.scheduled_time.split(':');
    const scheduledHour = parseInt(timeParts[0], 10);
    const scheduledMinute = parseInt(timeParts[1], 10);
    console.log('Parsed scheduled time:', { scheduledHour, scheduledMinute });
    
    // Use actual duration if available, otherwise use estimated duration
    const durationMinutes = jobData.actual_duration_minutes || jobData.estimated_duration_minutes || 60;
    console.log('Using duration minutes:', durationMinutes);
    
    // Calculate end time by adding duration
    const startMinutes = scheduledHour * 60 + scheduledMinute;
    const endMinutes = startMinutes + durationMinutes;
    
    // Convert back to hours and minutes
    let endHour = Math.floor(endMinutes / 60);
    const endMinute = endMinutes % 60;
    
    // Handle 12-hour format
    const startHour12 = scheduledHour === 0 ? 12 : scheduledHour > 12 ? scheduledHour - 12 : scheduledHour;
    const endHour12 = endHour === 0 ? 12 : endHour > 12 ? endHour - 12 : endHour;
    
    const result = {
      startTime: { 
        hour: startHour12, 
        minute: scheduledMinute,
        period: scheduledHour >= 12 ? "PM" : "AM"
      },
      endTime: { 
        hour: endHour12, 
        minute: endMinute,
        period: endHour >= 12 ? "PM" : "AM"
      }
    };
    
    console.log('Calculated times:', result);
    return result;
  };

  const { startTime, endTime } = calculateTimes();

  const [formData, setFormData] = useState({
    email: jobData?.interpreter_email || jobData?.email || "",
    order_number: jobId || "",
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

  const [endHour, setEndHour] = useState(endTime?.hour ? findOptionByValue(hourOptions, String(endTime.hour).padStart(2, "0")) : null);
  const [endMinute, setEndMinute] = useState(endTime?.minute ? findOptionByValue(minuteOptions, String(endTime.minute).padStart(2, "0")) : null);
  const [endPeriod, setEndPeriod] = useState(endTime?.period ? findOptionByValue(periodOptions, endTime.period) : null);

  // Update times when actual duration changes
  useEffect(() => {
    const { startTime, endTime } = calculateTimes();
    if (startTime && endTime) {
      setStartHour(findOptionByValue(hourOptions, String(startTime.hour).padStart(2, "0")));
      setStartMinute(findOptionByValue(minuteOptions, String(startTime.minute).padStart(2, "0")));
      setStartPeriod(findOptionByValue(periodOptions, startTime.period));
      
      setEndHour(findOptionByValue(hourOptions, String(endTime.hour).padStart(2, "0")));
      setEndMinute(findOptionByValue(minuteOptions, String(endTime.minute).padStart(2, "0")));
      setEndPeriod(findOptionByValue(periodOptions, endTime.period));
    }
  }, [jobData?.actual_duration_minutes, jobData?.scheduled_time]);

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

  const [files, setFiles] = useState([]);
  const [status, setStatus] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    setStatus({ message: "", type: "" });

    const data = new FormData();
    data.append("email", formData.email);
    data.append("order_number", formData.order_number);
    data.append("start_time", getTimeString(startHour, startMinute, startPeriod));
    data.append("end_time", getTimeString(endHour, endMinute, endPeriod));
    data.append("result", formData.result?.value || "");
    data.append("file_status", formData.file_status?.value || "");
    data.append("notes", formData.notes);

    if (formData.result?.value === "Completed with follow up") {
      data.append("follow_up_date", followUpDate);
      data.append("follow_up_time", getTimeString(followUpHour, followUpMinute, followUpPeriod));
      data.append("follow_up_street", followUpLocation.street);
      data.append("follow_up_city", followUpLocation.city);
      data.append("follow_up_state", followUpLocation.state);
      data.append("follow_up_zip", followUpLocation.zip);
      data.append("follow_up_country", followUpLocation.country);
      data.append("follow_up_available", isAvailable ? "Yes" : "No");
    }

    files.forEach((file) => data.append("documents", file));

    try {
      const token = localStorage.getItem('interpreterToken');
      const response = await fetch(`${API_BASE}/interpreters/jobs/${jobId}/completion-report`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: data
      });

      if (!response.ok) throw new Error("Submission failed");

      setStatus({ type: "success", message: "Submitted successfully!" });
      setFormData({
        email: jobData?.interpreter_email || "",
        order_number: jobId || "",
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
      setFiles([]);
      
      if (onSubmit) {
        onSubmit();
      }
    } catch (err) {
      setStatus({ type: "error", message: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative">
      {/* Close Button */}
      <button
        type="button"
        onClick={onCancel}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={24} />
      </button>
      
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-10 bg-white rounded-xl shadow-lg space-y-6 mt-10"
      >
        <h2 className="text-3xl font-bold text-center text-blue-800">
          Assignment Completion Report
        </h2>
        <p className="text-center text-gray-500 mb-6">
          Fill out the information below to submit the assignment status.
        </p>

      <input
        type="email"
        name="email"
        placeholder="Email *"
        required
        value={formData.email}
        onChange={handleInputChange}
        className="border p-3 rounded w-full"
      />
      <input
        type="text"
        name="order_number"
        placeholder="Order number *"
        required
        value={formData.order_number}
        onChange={handleInputChange}
        className="border p-3 rounded w-full"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Start Time */}
        <div>
          <label className="block mb-1 font-semibold">Start Time *</label>
          <div className="flex gap-2 items-center">
            <Select options={hourOptions} value={startHour} onChange={setStartHour} placeholder="HH" className="w-24" />
            <span>:</span>
            <Select options={minuteOptions} value={startMinute} onChange={setStartMinute} placeholder="MM" className="w-24" />
            <Select options={periodOptions} value={startPeriod} onChange={setStartPeriod} placeholder="AM/PM" className="w-28" />
          </div>
        </div>

        {/* End Time */}
        <div>
          <label className="block mb-1 font-semibold">End Time *</label>
          <div className="flex gap-2 items-center">
            <Select options={hourOptions} value={endHour} onChange={setEndHour} placeholder="HH" className="w-24" />
            <span>:</span>
            <Select options={minuteOptions} value={endMinute} onChange={setEndMinute} placeholder="MM" className="w-24" />
            <Select options={periodOptions} value={endPeriod} onChange={setEndPeriod} placeholder="AM/PM" className="w-28" />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Actual End time. We will pay the minimum agreed rate, but need actual end time for billing purposes.
          </p>
        </div>
      </div>

      {/* Result */}
      <div>
        <label className="block mb-1 font-semibold">Result *</label>
        <Select
          options={resultOptions}
          value={formData.result}
          onChange={(option) => setFormData({ ...formData, result: option })}
          placeholder="Select result"
        />
      </div>

      {/* Follow-up section (only if result = "Completed with follow up") */}
      {formData.result?.value === "Completed with follow up" && (
        <div className="animate-fade-in space-y-4 border p-4 rounded bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block font-semibold mb-1">Follow up date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full border p-2 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Follow up time</label>
              <div className="flex gap-2 items-center">
                <Select options={hourOptions} value={followUpHour} onChange={setFollowUpHour} placeholder="HH" className="w-20" />
                <span>:</span>
                <Select options={minuteOptions} value={followUpMinute} onChange={setFollowUpMinute} placeholder="MM" className="w-20" />
                <Select options={periodOptions} value={followUpPeriod} onChange={setFollowUpPeriod} placeholder="AM/PM" className="w-24" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" placeholder="Street" value={followUpLocation.street} onChange={(e) => setFollowUpLocation({ ...followUpLocation, street: e.target.value })} className="border p-2 rounded" />
            <input type="text" placeholder="City/Suburb" value={followUpLocation.city} onChange={(e) => setFollowUpLocation({ ...followUpLocation, city: e.target.value })} className="border p-2 rounded" />
            <input type="text" placeholder="State" value={followUpLocation.state} onChange={(e) => setFollowUpLocation({ ...followUpLocation, state: e.target.value })} className="border p-2 rounded" />
            <input type="text" placeholder="Zip/Postal Code" value={followUpLocation.zip} onChange={(e) => setFollowUpLocation({ ...followUpLocation, zip: e.target.value })} className="border p-2 rounded" />
            <input type="text" value="United States" readOnly className="border p-2 rounded text-gray-400" />
          </div>

          <label className="block font-semibold mt-4 mb-1">Are you available for the follow up?</label>
          <div className="flex gap-4">
            <button type="button" onClick={() => setIsAvailable(true)} className={`w-full p-2 rounded border ${isAvailable === true ? "bg-blue-600 text-white" : "bg-white"}`}>Yes</button>
            <button type="button" onClick={() => setIsAvailable(false)} className={`w-full p-2 rounded border ${isAvailable === false ? "bg-blue-600 text-white" : "bg-white"}`}>No</button>
          </div>
        </div>
      )}

      {/* File status */}
      <div>
        <label className="block mb-1 font-semibold">Status of this file *</label>
        <Select
          options={fileStatusOptions}
          value={formData.file_status}
          onChange={(option) => setFormData({ ...formData, file_status: option })}
          placeholder="Select status"
        />
      </div>

      <textarea
        name="notes"
        placeholder="Additional notes (optional)"
        value={formData.notes}
        onChange={handleInputChange}
        rows={4}
        className="w-full border p-3 rounded"
      />

      <div>
        <label className="block mb-2 font-semibold">
          Upload supporting files (optional)
        </label>
        <label className="flex items-center justify-between border p-3 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer">
          <span>Choose Files</span>
          <input type="file" multiple className="hidden" ref={fileInputRef} onChange={handleFileChange} />
          <PlusCircle size={20} className="text-blue-600" />
        </label>

        {files.length > 0 && (
          <ul className="mt-3 space-y-2 text-sm text-gray-700">
            {files.map((file, index) => (
              <li key={index} className="flex justify-between items-center bg-gray-100 p-2 rounded">
                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                <button type="button" onClick={() => removeFile(index)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" className={`w-full py-3 rounded text-white font-semibold transition ${isSubmitting ? "bg-blue-300" : "bg-blue-700 hover:bg-blue-800"}`} disabled={isSubmitting}>
        {isSubmitting ? "Submitting..." : "Submit"}
      </button>

      {status.message && (
        <div className={`mt-4 p-3 rounded text-center font-medium ${status.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {status.message}
        </div>
      )}
      </form>
    </div>
  );
};

export default InterpreterCompletionReport;