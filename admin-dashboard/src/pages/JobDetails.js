import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeftIcon,
  CalendarIcon, 
  ClockIcon,
  MapPinIcon,
  UserIcon,
  LanguageIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  UserPlusIcon,
  XMarkIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import JobWorkflow from '../components/JobWorkflow';
import SMSChatBox from '../components/SMSChatBox';
import JobNotes from '../components/JobNotes';
import ExternalRegistrySearch from '../components/ExternalRegistrySearch';
import AppointmentAuditLogs from '../components/AppointmentAuditLogs';
import { getJobStatusColor } from '../utils/statusConstants';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const JobDetails = ({ jobId, setCurrentView }) => {
  const [job, setJob] = useState(null);
  const [billingRates, setBillingRates] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [billingInfoExpanded, setBillingInfoExpanded] = useState(true);
  const [interpreterPaymentExpanded, setInterpreterPaymentExpanded] = useState(true);
  const [editingInterpreterPayment, setEditingInterpreterPayment] = useState(false);
  const [editingBillingInfo, setEditingBillingInfo] = useState(false);
  const [actualTotal, setActualTotal] = useState('');
  const [interpreterRate, setInterpreterRate] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [actualDuration, setActualDuration] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [facilityConfirmed, setFacilityConfirmed] = useState(false);
  const userInitiatedChange = useRef(false);
  const [updatingFacilityConfirmation, setUpdatingFacilityConfirmation] = useState(false);
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  
  // Change interpreter states
  const [showChangeInterpreterModal, setShowChangeInterpreterModal] = useState(false);
  const [availableInterpreters, setAvailableInterpreters] = useState([]);
  const [selectedInterpreterId, setSelectedInterpreterId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [loadingInterpreters, setLoadingInterpreters] = useState(false);
  const [changingInterpreter, setChangingInterpreter] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);
  const [availableServiceTypes, setAvailableServiceTypes] = useState([]);
  
  // Email history states
  const [jobEmails, setJobEmails] = useState([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [emailsExpanded, setEmailsExpanded] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // SMS history states
  const [jobSms, setJobSms] = useState([]);
  const [loadingSms, setLoadingSms] = useState(false);
  const [smsExpanded, setSmsExpanded] = useState(false);
  const [selectedSms, setSelectedSms] = useState(null);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [showExternalRegistrySearch, setShowExternalRegistrySearch] = useState(false);
  const [showAssignInterpreter, setShowAssignInterpreter] = useState(false);
  const [selectedInterpreterForAssignment, setSelectedInterpreterForAssignment] = useState('');
  const [assigningInterpreter, setAssigningInterpreter] = useState(false);
  const [showCreateInterpreter, setShowCreateInterpreter] = useState(false);
  const [creatingInterpreter, setCreatingInterpreter] = useState(false);
  const [newInterpreter, setNewInterpreter] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state_id: '',
    zip_code: '',
    years_of_experience: '',
    hourly_rate: '',
    bio: '',
    languages: [{ language_id: '', proficiency_level: 'fluent', is_primary: true }],
    service_types: []
  });
  
  // Collapsible section states
  const [serviceDetailsExpanded, setServiceDetailsExpanded] = useState(true);
  const [claimantInfoExpanded, setClaimantInfoExpanded] = useState(true);
  const [claimInfoExpanded, setClaimInfoExpanded] = useState(true);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  // Close external registry search if service category is not Medical Certified
  useEffect(() => {
    if (showExternalRegistrySearch && job && getServiceCategoryDisplayName(job) !== 'Medical Certified') {
      setShowExternalRegistrySearch(false);
    }
  }, [job, showExternalRegistrySearch]);

  // Auto-save billing information when actualTotal changes (with debouncing)
  useEffect(() => {
    // Only auto-save if we have a valid token and job data
    const token = localStorage.getItem('adminToken');
    if (!token || !job) {
      return;
    }
    
    // Don't auto-save if we're already saving, if it's not a user-initiated change, or if the value is invalid
    if (isAutoSaving || !userInitiatedChange.current || !actualTotal || actualTotal === '' || isNaN(parseFloat(actualTotal))) {
      return;
    }
    
    const currentDbAmount = job?.total_amount || job?.billed_amount || 0;
    const newAmount = parseFloat(actualTotal);
    
    // Only auto-save if the amount is significantly different from what's in the database
    if (Math.abs(newAmount - parseFloat(currentDbAmount)) > 0.01) {
      // Debounce the auto-save to prevent too many API calls
      const timeoutId = setTimeout(() => {
        autoSaveBillingInfo(actualTotal);
        userInitiatedChange.current = false; // Reset the flag after saving
      }, 2000); // Wait 2 seconds before saving
      
      // Cleanup timeout if component unmounts or dependencies change
      return () => clearTimeout(timeoutId);
    }
  }, [actualTotal, job?.total_amount, job?.billed_amount, job, isAutoSaving]);

  // Auto-calculate billing when billing rates are loaded
  useEffect(() => {
    // Only auto-calculate if we have a valid token and job data
    const token = localStorage.getItem('adminToken');
    if (!token || !job) {
      return;
    }
    
    if (billingRates && job && (!job.total_amount || job.total_amount === 0)) {
      const calculatedTotal = calculateBillingTotal(job, billingRates, 'actual');
      if (calculatedTotal && calculatedTotal !== '0.00') {
        userInitiatedChange.current = false; // Don't auto-save when auto-calculating
        setActualTotal(calculatedTotal);
      }
    }
  }, [billingRates, job]);

  const handleFacilityConfirmationChange = async (checked) => {
    try {
      setUpdatingFacilityConfirmation(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/facility-confirmation`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          facility_confirmed: checked
        })
      });
      
      if (response.ok) {
        setFacilityConfirmed(checked);
        setJob(prev => ({
          ...prev,
          facility_confirmed: checked
        }));
        toast.success('Facility confirmation status updated successfully');
      } else {
        toast.error('Failed to update facility confirmation status');
      }
    } catch (error) {
      console.error('Error updating facility confirmation:', error);
      toast.error('Failed to update facility confirmation status');
    } finally {
      setUpdatingFacilityConfirmation(false);
    }
  };

  const loadJobDetails = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      // Load job details
      const jobResponse = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData.data);
        setFacilityConfirmed(jobData.data.facility_confirmed || false);
        userInitiatedChange.current = false; // Don't auto-save when loading data
        setActualTotal(jobData.data.total_amount || jobData.data.billed_amount || '');
        
        // Load billing rates for all jobs
        const ratesResponse = await fetch(`${API_BASE}/admin/jobs/${jobId}/billing-rates`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (ratesResponse.ok) {
          const ratesData = await ratesResponse.json();
          setBillingRates(ratesData.data);
        } else {
          console.error('Failed to fetch billing rates:', ratesResponse.status);
        }
      } else {
        toast.error('Failed to load job details');
      }
    } catch (error) {
      console.error('Error loading job details:', error);
      toast.error('Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Job deleted successfully');
        setCurrentView('jobs');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete job');
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    } finally {
      setDeleting(false);
    }
  };

  const handleApproveJob = async () => {
    if (!window.confirm('Are you sure you want to approve this appointment? It will be made available to interpreters.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/authorize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Appointment approved successfully and sent to interpreters');
        loadJobDetails(); // Reload to show updated status
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to approve appointment');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      toast.error('Failed to approve appointment');
    }
  };

  const handleRejectJob = async () => {
    const reason = window.prompt('Please provide a reason for rejecting this appointment:');
    if (reason === null) {
      return; // User cancelled
    }

    try {
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: reason || 'No reason provided'
        })
      });
      
      if (response.ok) {
        toast.success('Appointment rejected successfully');
        loadJobDetails(); // Reload to show updated status
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Error rejecting appointment:', error);
      toast.error('Failed to reject appointment');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatEndTime = (timeString, durationMinutes) => {
    const startTime = new Date(`2000-01-01T${timeString}`);
    const endTime = new Date(startTime.getTime() + (durationMinutes * 60000));
    return endTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0) {
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getServiceCategoryDisplayName = (job) => {
    // Map interpreter type and language to service category
    const interpreterType = job.interpreter_type_code;
    const language = job.target_language_name?.toLowerCase();
    
    if (interpreterType === 'qualified_standard') {
      return 'General';
    } else if (interpreterType === 'court_certified') {
      return language === 'spanish' ? 'Legal - Spanish' : 'Legal - Non-Spanish';
    } else if (interpreterType === 'medical_certified') {
      return 'Medical Certified';
    }
    
    return 'N/A';
  };

  const calculateBillingTotal = (job, billingRates, type) => {
    
    if (!billingRates || !billingRates.rates || billingRates.rates.length === 0) {
      return '0.00';
    }
    
    let duration;
    if (type === 'estimated') {
      duration = job.estimated_duration_minutes;
    } else if (type === 'actual') {
      // For actual billing, use the maximum of estimated and actual duration
      const estimatedMinutes = job.estimated_duration_minutes || 0;
      const actualMinutes = job.actual_duration_minutes || 0;
      duration = Math.max(estimatedMinutes, actualMinutes);
    }
    
    if (!duration) {
      return '0.00';
    }
    
    
    // Find the appropriate rate based on duration
    const rates = billingRates.rates.sort((a, b) => a.time_minutes - b.time_minutes);
    
    let total = 0;
    let remainingMinutes = duration;
    
    // Apply Time A rate first (minimum time)
    const timeARate = rates.find(rate => rate.rate_type === 'A');
    if (timeARate && remainingMinutes >= timeARate.time_minutes) {
      total += parseFloat(timeARate.rate_amount);
      remainingMinutes -= timeARate.time_minutes;
    }
    
    // Apply Time B rate for additional time
    const timeBRate = rates.find(rate => rate.rate_type === 'B');
    if (timeBRate && remainingMinutes > 0) {
      const additionalPeriods = Math.ceil(remainingMinutes / timeBRate.time_minutes);
      total += parseFloat(timeBRate.rate_amount) * additionalPeriods;
    }
    
    return total.toFixed(2);
  };

  const calculateInterpreterPayment = (job, type) => {
    // Debug logging
    if (job && job.job_number === 'JOB-000041') {
      console.log('calculateInterpreterPayment debug for JOB-000041:');
      console.log('  job.hourly_rate:', job.hourly_rate);
      console.log('  editingInterpreterPayment:', editingInterpreterPayment);
      console.log('  interpreterRate:', interpreterRate);
      console.log('  job.estimated_duration_minutes:', job.estimated_duration_minutes);
      console.log('  estimatedDuration:', estimatedDuration);
    }
    
    // Add null checks for job
    if (!job) {
      return '0.00';
    }
    
    // Use editing state values when in edit mode, otherwise use job values
    const currentRate = editingInterpreterPayment && interpreterRate ? parseFloat(interpreterRate) : parseFloat(job.hourly_rate || 0);
    const currentEstimatedDuration = editingInterpreterPayment && estimatedDuration ? parseInt(estimatedDuration) : (job.estimated_duration_minutes || 0);
    const currentActualDuration = editingInterpreterPayment && actualDuration ? parseInt(actualDuration) : (job.actual_duration_minutes || 0);
    
    if (!currentRate || currentRate <= 0) {
      return '0.00';
    }
    
    
    // Determine if this is a legal appointment
    // Only court certified interpreters OR explicitly legal services (not medical-legal or non-legal)
    const isLegalAppointment = job.interpreter_type_code === 'court_certified' || 
                               (job.service_type_name?.toLowerCase().includes('legal') && 
                                !job.service_type_name?.toLowerCase().includes('non-legal') &&
                                !job.service_type_name?.toLowerCase().includes('medical'));
    
    // Set increment based on appointment type
    const incrementMinutes = isLegalAppointment ? 180 : 15; // 3 hours for legal, 15 minutes for others
    
    
    if (type === 'estimated') {
      // For estimated payment, use incremental billing
      const duration = currentEstimatedDuration;
      if (!duration) return '0.00';
      
      const total = calculateIncrementalPayment(duration, currentRate, incrementMinutes);
      return total.toFixed(2);
    } else {
      // For actual payment, use minimum rate logic with incremental billing
      const actualMinutes = currentActualDuration || 0;
      const bookedMinutes = currentEstimatedDuration || 0;
      const minimumMinutes = Math.max(bookedMinutes, actualMinutes);
      
      if (minimumMinutes === 0) return '0.00';
      
      const total = calculateIncrementalPayment(minimumMinutes, currentRate, incrementMinutes);
      return total.toFixed(2);
    }
  };

  const calculateIncrementalPayment = (totalMinutes, hourlyRate, incrementMinutes) => {
    if (totalMinutes <= 0) return 0;
    
    // Calculate how many increments we need
    const increments = Math.ceil(totalMinutes / incrementMinutes);
    const totalIncrementalMinutes = increments * incrementMinutes;
    const totalHours = totalIncrementalMinutes / 60;
    const payment = hourlyRate * totalHours;
    
    
    return payment;
  };

  const handleEditInterpreterPayment = () => {
    setInterpreterRate(job.hourly_rate || '');
    setEstimatedDuration(job.estimated_duration_minutes || '');
    setActualDuration(job.actual_duration_minutes || '');
    setEditingInterpreterPayment(true);
  };

  const handleSaveInterpreterPayment = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      console.log('Saving interpreter payment with values:');
      console.log('  interpreterRate:', interpreterRate);
      console.log('  estimatedDuration:', estimatedDuration);
      console.log('  actualDuration:', actualDuration);
      console.log('  job.hourly_rate:', job.hourly_rate);
      console.log('  job.estimated_duration_minutes:', job.estimated_duration_minutes);
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hourly_rate: parseFloat(interpreterRate) || job.hourly_rate,
          estimated_duration_minutes: parseInt(estimatedDuration) || job.estimated_duration_minutes,
          actual_duration_minutes: parseInt(actualDuration) || job.actual_duration_minutes
        })
      });

      if (response.ok) {
        const updatedJob = await response.json();
        console.log('Updated job data:', updatedJob.data);
        setJob(updatedJob.data);
        setEditingInterpreterPayment(false);
        toast.success('Interpreter payment updated successfully');
        
        // Refresh the page to ensure all data is properly loaded
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.error('Failed to update interpreter payment:', errorData);
        toast.error('Failed to update interpreter payment');
      }
    } catch (error) {
      console.error('Error updating interpreter payment:', error);
      toast.error('Failed to update interpreter payment');
    }
  };

  const handleCancelEdit = () => {
    setEditingInterpreterPayment(false);
    setEditingBillingInfo(false);
    setInterpreterRate('');
    setEstimatedDuration('');
    setActualDuration('');
        userInitiatedChange.current = false; // Don't auto-save when resetting
        setActualTotal(job.total_amount || job.billed_amount || '');
  };

  const handleExternalInterpreterSelect = (interpreter) => {
    // Handle external interpreter selection
    // This could create a new interpreter record or add them to the system
    console.log('Selected external interpreter:', interpreter);
    toast.success(`External interpreter ${interpreter.firstName} ${interpreter.lastName} selected. Contact information saved.`);
    
    // You could implement logic here to:
    // 1. Create a new interpreter record in your system
    // 2. Send them an invitation to join
    // 3. Add them to the job directly
    // 4. Store their contact information for future reference
  };

  // Auto-save billing information when actualTotal changes
  const autoSaveBillingInfo = async (newActualTotal) => {
    // Prevent multiple simultaneous auto-save requests
    if (isAutoSaving) {
      console.log('Auto-save already in progress, skipping');
      return;
    }
    
    try {
      setIsAutoSaving(true);
      const token = localStorage.getItem('adminToken');
      
      // Check if token exists
      if (!token) {
        console.log('No admin token found, skipping auto-save');
        return;
      }
      
      console.log('Auto-saving billing information:', newActualTotal);
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          total_amount: parseFloat(newActualTotal) || 0,
          billed_amount: parseFloat(newActualTotal) || 0
        })
      });

      if (response.ok) {
        const updatedJob = await response.json();
        setJob(updatedJob.data);
        userInitiatedChange.current = false; // Reset flag after successful save
        console.log('Billing information auto-saved successfully:', newActualTotal);
      } else {
        // Handle different error types
        if (response.status === 429) {
          console.log('Rate limit reached, skipping auto-save for now');
          return;
        }
        
        try {
          const errorData = await response.json();
          console.error('Failed to auto-save billing information:', errorData.message);
        } catch (parseError) {
          console.error('Failed to auto-save billing information:', response.status, response.statusText);
        }
      }
    } catch (error) {
      console.error('Error auto-saving billing information:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleSaveBillingInfo = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          total_amount: parseFloat(actualTotal) || 0,
          billed_amount: parseFloat(actualTotal) || 0
        })
      });

      if (response.ok) {
        const updatedJob = await response.json();
        setJob(updatedJob.data);
        setEditingBillingInfo(false);
        toast.success('Billing information updated successfully');
        
        // Refresh the page to ensure all data is properly loaded
        window.location.reload();
      } else {
        toast.error('Failed to update billing information');
      }
    } catch (error) {
      console.error('Error updating billing information:', error);
      toast.error('Failed to update billing information');
    }
  };

  const handleChangeInterpreter = () => {
    setShowChangeInterpreterModal(true);
    loadAvailableInterpreters();
  };

  const handleAssignInterpreter = () => {
    setShowAssignInterpreter(true);
    loadAvailableInterpreters();
    loadFormData();
  };

  const loadAvailableInterpreters = async () => {
    try {
      setLoadingInterpreters(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/available-interpreters`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableInterpreters(data.data);
      } else {
        toast.error('Failed to load available interpreters');
      }
    } catch (error) {
      console.error('Error loading interpreters:', error);
      toast.error('Failed to load available interpreters');
    } finally {
      setLoadingInterpreters(false);
    }
  };

  const handleConfirmChangeInterpreter = async () => {
    if (!selectedInterpreterId) {
      toast.error('Please select an interpreter');
      return;
    }

    try {
      setChangingInterpreter(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/change-interpreter`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interpreter_id: selectedInterpreterId,
          reason: changeReason
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setJob(prev => ({
          ...prev,
          assigned_interpreter_id: data.data.job.assigned_interpreter_id,
          interpreter_name: `${data.data.newInterpreter.first_name} ${data.data.newInterpreter.last_name}`,
          interpreter_email: data.data.newInterpreter.email
        }));
        
        toast.success('Interpreter changed successfully');
        setShowChangeInterpreterModal(false);
        setSelectedInterpreterId('');
        setChangeReason('');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to change interpreter');
      }
    } catch (error) {
      console.error('Error changing interpreter:', error);
      toast.error('Failed to change interpreter');
    } finally {
      setChangingInterpreter(false);
    }
  };

  const handleCloseChangeInterpreterModal = () => {
    setShowChangeInterpreterModal(false);
    setSelectedInterpreterId('');
    setChangeReason('');
  };

  const handleConfirmAssignInterpreter = async () => {
    if (!selectedInterpreterForAssignment) {
      toast.error('Please select an interpreter');
      return;
    }

    setAssigningInterpreter(true);
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/assign-interpreter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          interpreter_id: selectedInterpreterForAssignment
        })
      });

      if (response.ok) {
        const data = await response.json();
        setJob(prev => ({
          ...prev,
          assigned_interpreter_id: data.data.job.assigned_interpreter_id,
          status: data.data.job.status,
          interpreter_name: `${data.data.newInterpreter.first_name} ${data.data.newInterpreter.last_name}`,
          interpreter_email: data.data.newInterpreter.email
        }));
        
        toast.success('Interpreter assigned successfully');
        setShowAssignInterpreter(false);
        setSelectedInterpreterForAssignment('');
        loadJobDetails(); // Refresh job details
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to assign interpreter');
      }
    } catch (error) {
      console.error('Error assigning interpreter:', error);
      toast.error('Failed to assign interpreter');
    } finally {
      setAssigningInterpreter(false);
    }
  };

  const handleCloseAssignInterpreterModal = () => {
    setShowAssignInterpreter(false);
    setSelectedInterpreterForAssignment('');
  };

  const loadFormData = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      
      if (!token) {
        console.error('No admin token found in localStorage');
        toast.error('Please log in to access this feature');
        return;
      }

      console.log('Loading form data with token:', token.substring(0, 20) + '...');
      
      const [languagesResponse, statesResponse, serviceTypesResponse] = await Promise.all([
        fetch(`${API_BASE}/admin/languages`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/admin/states`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/admin/service-types`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (languagesResponse.ok) {
        const languagesData = await languagesResponse.json();
        console.log('Languages loaded:', languagesData.data);
        setAvailableLanguages(languagesData.data || []);
      } else {
        const errorText = await languagesResponse.text();
        console.error('Failed to load languages:', languagesResponse.status, errorText);
        if (languagesResponse.status === 401 || languagesResponse.status === 403) {
          toast.error('Session expired. Please log in again.');
        }
      }

      if (statesResponse.ok) {
        const statesData = await statesResponse.json();
        console.log('States loaded:', statesData.data);
        setAvailableStates(statesData.data || []);
      } else {
        const errorText = await statesResponse.text();
        console.error('Failed to load states:', statesResponse.status, errorText);
      }

      if (serviceTypesResponse.ok) {
        const serviceTypesData = await serviceTypesResponse.json();
        console.log('Service types loaded:', serviceTypesData.data);
        setAvailableServiceTypes(serviceTypesData.data || []);
      } else {
        const errorText = await serviceTypesResponse.text();
        console.error('Failed to load service types:', serviceTypesResponse.status, errorText);
      }
    } catch (error) {
      console.error('Error loading form data:', error);
      toast.error('Failed to load form data');
    }
  };

  const handleCreateInterpreter = async () => {
    if (!newInterpreter.first_name || !newInterpreter.last_name || !newInterpreter.email) {
      toast.error('Please fill in required fields (First Name, Last Name, Email)');
      return;
    }

    setCreatingInterpreter(true);
    try {
      const token = localStorage.getItem('adminToken');
      
      // Clean up the data before sending - convert empty strings to null for integer fields
      const cleanedData = {
        ...newInterpreter,
        state_id: newInterpreter.state_id || null,
        years_of_experience: newInterpreter.years_of_experience ? parseInt(newInterpreter.years_of_experience) : null,
        hourly_rate: newInterpreter.hourly_rate ? parseFloat(newInterpreter.hourly_rate) : null,
        phone: newInterpreter.phone || null,
        city: newInterpreter.city || null,
        zip_code: newInterpreter.zip_code || null,
        bio: newInterpreter.bio || null
      };
      
      // Ensure the interpreter speaks the job's source language
      if (job?.source_language_id) {
        // Check if the source language is already in the languages array
        const hasSourceLanguage = cleanedData.languages.some(lang => lang.language_id === job.source_language_id);
        
        if (!hasSourceLanguage) {
          // Add the source language as the primary language
          cleanedData.languages = [
            {
              language_id: job.source_language_id,
              proficiency_level: 'fluent',
              is_primary: true
            },
            ...cleanedData.languages.map(lang => ({ ...lang, is_primary: false }))
          ];
        }
      }
      
      const response = await fetch(`${API_BASE}/admin/interpreters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(cleanedData)
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Interpreter created successfully');
        
        // Add the new interpreter to the available interpreters list
        setAvailableInterpreters(prev => [...prev, data.data]);
        
        // Select the newly created interpreter
        setSelectedInterpreterForAssignment(data.data.id);
        
        // Close the create interpreter form
        setShowCreateInterpreter(false);
        
        // Reset the form
        setNewInterpreter({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          city: '',
          state_id: '',
          zip_code: '',
          years_of_experience: '',
          hourly_rate: '',
          bio: '',
          languages: [{ language_id: '', proficiency_level: 'fluent', is_primary: true }],
          service_types: []
        });
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create interpreter');
      }
    } catch (error) {
      console.error('Error creating interpreter:', error);
      toast.error('Failed to create interpreter');
    } finally {
      setCreatingInterpreter(false);
    }
  };

  const handleAddLanguage = () => {
    setNewInterpreter(prev => ({
      ...prev,
      languages: [...prev.languages, { language_id: '', proficiency_level: 'fluent', is_primary: false }]
    }));
  };

  const handleRemoveLanguage = (index) => {
    setNewInterpreter(prev => ({
      ...prev,
      languages: prev.languages.filter((_, i) => i !== index)
    }));
  };

  const handleLanguageChange = (index, field, value) => {
    setNewInterpreter(prev => ({
      ...prev,
      languages: prev.languages.map((lang, i) => 
        i === index ? { ...lang, [field]: value } : lang
      )
    }));
  };

  const handleAddServiceType = () => {
    setNewInterpreter(prev => ({
      ...prev,
      service_types: [...prev.service_types, { service_type_id: '', rate_type: 'platform' }]
    }));
  };

  const handleRemoveServiceType = (index) => {
    setNewInterpreter(prev => ({
      ...prev,
      service_types: prev.service_types.filter((_, i) => i !== index)
    }));
  };

  const handleServiceTypeChange = (index, field, value) => {
    setNewInterpreter(prev => ({
      ...prev,
      service_types: prev.service_types.map((st, i) => 
        i === index ? { ...st, [field]: value } : st
      )
    }));
  };

  const loadJobEmails = async () => {
    try {
      setLoadingEmails(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/emails`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobEmails(data.data);
      } else {
        toast.error('Failed to load email history');
      }
    } catch (error) {
      console.error('Error loading job emails:', error);
      toast.error('Failed to load email history');
    } finally {
      setLoadingEmails(false);
    }
  };

  const loadJobSms = async () => {
    try {
      setLoadingSms(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/sms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobSms(data.data);
      } else {
        toast.error('Failed to load SMS history');
      }
    } catch (error) {
      console.error('Error loading job SMS:', error);
      toast.error('Failed to load SMS history');
    } finally {
      setLoadingSms(false);
    }
  };

  const handleViewInvoicePDF = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/invoice`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Get the PDF blob
        const blob = await response.blob();
        
        // Create object URL and open in new tab
        const url = window.URL.createObjectURL(blob);
        const newWindow = window.open(url, '_blank');
        
        // Clean up the object URL after a short delay
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 1000);
        
        if (!newWindow) {
          toast.error('Please allow popups to view the invoice PDF');
        }
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to load invoice PDF');
      }
    } catch (error) {
      console.error('Error viewing invoice PDF:', error);
      toast.error('Failed to load invoice PDF');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Job not found</h3>
          <p className="mt-1 text-sm text-gray-500">The job you're looking for doesn't exist.</p>
          <button
            onClick={() => setCurrentView('jobs')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Jobs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-8xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => setCurrentView('jobs')}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{job.job_number || job.title}</h1>
                <p className="mt-2 text-gray-600">Job Details</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {job.status === 'pending_authorization' ? (
                <>
                  <button
                    onClick={handleApproveJob}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                  >
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Approve & Send to Interpreters
                  </button>
                  <button
                    onClick={handleRejectJob}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center"
                  >
                    <XCircleIcon className="h-5 w-5 mr-2" />
                    Reject
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setCurrentView('edit-job', { jobId })}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Edit Job
                  </button>
                  <button
                    onClick={() => setShowAuditLogs(true)}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
                  >
                    <DocumentTextIcon className="h-5 w-5 mr-2" />
                    View Changes
                  </button>
                  {job.assigned_interpreter_id ? (
                    <button
                      onClick={handleChangeInterpreter}
                      className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center"
                    >
                      <UserPlusIcon className="h-5 w-5 mr-2" />
                      Change Interpreter
                    </button>
                  ) : job.status === 'finding_interpreter' && (
                    <button
                      onClick={handleAssignInterpreter}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
                    >
                      <UserPlusIcon className="h-5 w-5 mr-2" />
                      Assign Interpreter
                    </button>
                  )}
                  {(job.status === 'finding_interpreter' || job.status === 'assigned') && 
                   getServiceCategoryDisplayName(job) === 'Medical Certified' && (
                    <button
                      onClick={() => setShowExternalRegistrySearch(true)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center"
                    >
                      <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                      Search External Registries
                    </button>
                  )}
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Delete Job'}
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Job Workflow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <JobWorkflow 
            job={job} 
            actualTotal={actualTotal}
            onJobUpdate={(updatedJob) => {
              setJob(updatedJob);
              toast.success('Job updated successfully');
            }}
          />
        </motion.div>

        {/* Main Content Layout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col xl:flex-row gap-8"
        >
          {/* Left Column - Job Information */}
          <div className="flex-1 space-y-8">
            {/* Job Information Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Job Number</label>
                <p className="text-sm text-gray-900 mt-1">{job?.job_number || job?.title || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description</label>
                <p className="text-sm text-gray-900 mt-1">{job.description || 'No description provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getJobStatusColor(job.status)}`}>
                    {job.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Job Type</label>
                <p className="text-sm text-gray-900 mt-1 capitalize">{job.job_type}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Requested By</label>
                <p className="text-sm text-gray-900 mt-1">{job.requested_by_name || 'Not specified'}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
              Schedule
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Date</label>
                <p className="text-sm text-gray-900 mt-1">{formatDate(job.scheduled_date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Time</label>
                <p className="text-sm text-gray-900 mt-1">{formatTime(job.scheduled_time)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">End Time</label>
                <p className="text-sm text-gray-900 mt-1">{formatEndTime(job.scheduled_time, job.estimated_duration_minutes)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Duration</label>
                <p className="text-sm text-gray-900 mt-1">{job.estimated_duration_minutes} minutes</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <p className="text-sm text-gray-900 mt-1">
                  {job.is_remote ? 'Remote' : 'In Person'}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
              <MapPinIcon className="h-5 w-5 mr-2 text-blue-600" />
              Location
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Address</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_address || 'No address provided'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">City</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_city || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">State</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_state || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Zip Code</label>
                <p className="text-sm text-gray-900 mt-1">{job.location_zip_code || 'N/A'}</p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <label className="text-sm font-medium text-gray-700">Facility Phone</label>
                  <p className="text-sm text-gray-900 mt-1">{job.facility_phone || 'N/A'}</p>
                </div>
                <div className="flex items-center ml-4">
                  <input
                    type="checkbox"
                    checked={facilityConfirmed}
                    onChange={(e) => handleFacilityConfirmationChange(e.target.checked)}
                    disabled={updatingFacilityConfirmation}
                    className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700">Confirm with Facility</span>
                </div>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                  <div 
                    className="flex items-center cursor-pointer flex-1"
                    onClick={() => setServiceDetailsExpanded(!serviceDetailsExpanded)}
                  >
                    <LanguageIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Service Details
                  </div>
                  <div 
                    className="cursor-pointer p-1 rounded hover:bg-gray-100"
                    onClick={() => setServiceDetailsExpanded(!serviceDetailsExpanded)}
                  >
                    {serviceDetailsExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </h3>
              </div>
            </div>
            {serviceDetailsExpanded && (
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Service Type</label>
                    <p className="text-sm text-gray-900 mt-1">{job.service_type_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Languages</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.source_language_name || 'N/A'} → {job.target_language_name || 'English'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Claimant Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                  <div 
                    className="flex items-center cursor-pointer flex-1"
                    onClick={() => setClaimantInfoExpanded(!claimantInfoExpanded)}
                  >
                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Claimant Information
                  </div>
                  <div 
                    className="cursor-pointer p-1 rounded hover:bg-gray-100"
                    onClick={() => setClaimantInfoExpanded(!claimantInfoExpanded)}
                  >
                    {claimantInfoExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </h3>
              </div>
            </div>
            {claimantInfoExpanded && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.claimant_first_name && job.claimant_last_name 
                        ? `${job.claimant_first_name} ${job.claimant_last_name}`
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">{job.claimant_phone || 'N/A'}</p>
                  </div>
                   <div className="xl:col-span-2">
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.claimant_address ? (
                        <>
                          {job.claimant_address}
                          {job.claimant_city && job.claimant_state && (
                            <><br />{job.claimant_city}, {job.claimant_state} {job.claimant_zip_code}</>
                          )}
                        </>
                      ) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Claim Information */}
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="border-b border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                  <div 
                    className="flex items-center cursor-pointer flex-1"
                    onClick={() => setClaimInfoExpanded(!claimInfoExpanded)}
                  >
                    <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Claim Information
                  </div>
                  <div 
                    className="cursor-pointer p-1 rounded hover:bg-gray-100"
                    onClick={() => setClaimInfoExpanded(!claimInfoExpanded)}
                  >
                    {claimInfoExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                </h3>
              </div>
            </div>
            {claimInfoExpanded && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Claim Number</label>
                    <p className="text-sm text-gray-900 mt-1">{job.claim_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Case Type</label>
                    <p className="text-sm text-gray-900 mt-1">{job.case_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Date of Injury</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.date_of_injury ? new Date(job.date_of_injury).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Diagnosis</label>
                    <p className="text-sm text-gray-900 mt-1">{job.diagnosis || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Interpreter Details */}
          {job.assigned_interpreter_id && (
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                    Interpreter Details
                  </h3>
                </div>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Name</label>
                    <p className="text-sm text-gray-900 mt-1 font-medium">
                      {job.interpreter_first_name} {job.interpreter_last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.assigned_interpreter_email || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.assigned_interpreter_phone || 'N/A'}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Interpreter Confirmed</label>
                    <div className="mt-2">
                      {job.confirmation_status === 'confirmed' ? (
                        <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-full w-fit">
                          <CheckCircleIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm font-medium">Confirmed</span>
                          {job.confirmed_at && (
                            <span className="text-xs text-green-500 ml-2">
                              ({new Date(job.confirmed_at).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      ) : job.confirmation_status === 'declined' ? (
                        <div className="flex items-center text-red-600 bg-red-50 px-4 py-2 rounded-full w-fit">
                          <XCircleIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm font-medium">Declined</span>
                          {job.confirmed_at && (
                            <span className="text-xs text-red-500 ml-2">
                              ({new Date(job.confirmed_at).toLocaleDateString()})
                            </span>
                          )}
                        </div>
                      ) : job.confirmation_status === 'pending' ? (
                        <div className="flex items-center text-orange-600 bg-orange-50 px-4 py-2 rounded-full w-fit">
                          <ClockIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm font-medium">Pending Confirmation</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-500 bg-gray-50 px-4 py-2 rounded-full w-fit">
                          <ClockIcon className="h-5 w-5 mr-2" />
                          <span className="text-sm font-medium">Not Required</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Assignment Status</label>
                    <div className="mt-2">
                      <span className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        Assigned
                      </span>
                    </div>
                  </div>
                  
                  {job.confirmation_notes && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <label className="text-sm font-medium text-gray-700 block mb-2">Confirmation Notes</label>
                      <p className="text-sm text-gray-600 italic">
                        {job.confirmation_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Interpreter Payment */}
          <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    <div 
                      className="flex items-center cursor-pointer flex-1"
                      onClick={() => setInterpreterPaymentExpanded(!interpreterPaymentExpanded)}
                    >
                      <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Interpreter Payment
                    </div>
                    <div className="flex items-center space-x-2">
                      {!editingInterpreterPayment && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditInterpreterPayment();
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      )}
                      <div 
                        className="cursor-pointer p-1 rounded hover:bg-gray-100"
                        onClick={() => setInterpreterPaymentExpanded(!interpreterPaymentExpanded)}
                      >
                        {interpreterPaymentExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </h3>
                </div>
              </div>
              
              {interpreterPaymentExpanded && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Interpreter</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.interpreter_first_name} {job.interpreter_last_name}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Interpreter Rate</label>
                    {editingInterpreterPayment ? (
                      <div className="mt-1 flex items-center space-x-2">
                        <input
                          type="number"
                          step="0.01"
                          value={interpreterRate}
                          onChange={(e) => setInterpreterRate(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0.00"
                        />
                        <span className="text-sm text-gray-600">/ hour</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {(() => {
                          const displayRate = editingInterpreterPayment && interpreterRate ? parseFloat(interpreterRate).toFixed(2) : (job?.hourly_rate ? parseFloat(job.hourly_rate).toFixed(2) : 'N/A');
                          if (job && job.job_number === 'JOB-000041') {
                            console.log('Display rate for JOB-000041:', displayRate, 'editingInterpreterPayment:', editingInterpreterPayment, 'interpreterRate:', interpreterRate, 'job.hourly_rate:', job.hourly_rate);
                          }
                          return `$${displayRate} / hour`;
                        })()}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Duration</label>
                    {editingInterpreterPayment ? (
                      <div className="mt-1 flex items-center space-x-2">
                        <input
                          type="number"
                          value={estimatedDuration}
                          onChange={(e) => setEstimatedDuration(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {editingInterpreterPayment && estimatedDuration ? estimatedDuration : (job?.estimated_duration_minutes || 'N/A')} minutes ({formatDuration(editingInterpreterPayment && estimatedDuration ? parseInt(estimatedDuration) : (job?.estimated_duration_minutes || 0))})
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Actual Duration</label>
                    {editingInterpreterPayment ? (
                      <div className="mt-1 flex items-center space-x-2">
                        <input
                          type="number"
                          value={actualDuration}
                          onChange={(e) => setActualDuration(e.target.value)}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md text-sm"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600">minutes</span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1">
                        {(() => {
                          const currentActualDuration = editingInterpreterPayment && actualDuration ? parseInt(actualDuration) : (job?.actual_duration_minutes || 0);
                          return currentActualDuration !== null && currentActualDuration !== undefined && currentActualDuration > 0
                            ? `${currentActualDuration} minutes (${formatDuration(currentActualDuration)})`
                            : 'N/A minutes';
                        })()}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Payment</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">
                      ${calculateInterpreterPayment(job, 'estimated')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Actual Payment</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold text-green-600">
                      ${calculateInterpreterPayment(job, 'actual')}
                    </p>
                  </div>
                  
                  {editingInterpreterPayment && (
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveInterpreterPayment}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* Billing Information */}
          <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center justify-between">
                    <div 
                      className="flex items-center cursor-pointer flex-1"
                      onClick={() => setBillingInfoExpanded(!billingInfoExpanded)}
                    >
                      <CurrencyDollarIcon className="h-5 w-5 mr-2 text-green-600" />
                      Billing Information
                    </div>
                    <div className="flex items-center space-x-2">
                      {!editingBillingInfo && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingBillingInfo(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Edit
                        </button>
                      )}
                      <div 
                        className="cursor-pointer p-1 rounded hover:bg-gray-100"
                        onClick={() => setBillingInfoExpanded(!billingInfoExpanded)}
                      >
                        {billingInfoExpanded ? (
                          <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </h3>
                </div>
              </div>
              
              {billingInfoExpanded && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Service Category</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {getServiceCategoryDisplayName(job)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Billing Account</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.billing_account_name || 'N/A'}
                    </p>
                  </div>
                  
                  {/* Billing Account Rates - Time A first, then Time B */}
                  {billingRates && billingRates.rates && billingRates.rates.length > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Billing Account Rates</label>
                      <div className="mt-2 space-y-2">
                        {/* Sort rates to show Time A first, then Time B */}
                        {billingRates.rates
                          .sort((a, b) => a.rate_type.localeCompare(b.rate_type))
                          .map((rate, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                Time {rate.rate_type}
                              </span>
                              <p className="text-xs text-gray-600">
                                {formatDuration(rate.time_minutes)} minimum
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-gray-900">
                                ${parseFloat(rate.rate_amount).toFixed(2)}
                              </span>
                              <p className="text-xs text-gray-600">
                                per {formatDuration(rate.time_minutes)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Duration</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {job.estimated_duration_minutes} minutes ({formatDuration(job.estimated_duration_minutes)})
                    </p>
                  </div>
                  {job.actual_duration_minutes && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Actual Duration</label>
                      <p className="text-sm text-gray-900 mt-1">
                        {job.actual_duration_minutes} minutes ({formatDuration(job.actual_duration_minutes)})
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estimated Total</label>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">
                      ${calculateBillingTotal(job, billingRates, 'estimated')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Actual Total</label>
                    {editingBillingInfo ? (
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-sm text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={actualTotal}
                          onChange={(e) => {
                            userInitiatedChange.current = true;
                            setActualTotal(e.target.value);
                          }}
                          className="w-24 px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-green-600"
                          placeholder="0.00"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 mt-1 font-semibold text-green-600">
                        ${actualTotal || calculateBillingTotal(job, billingRates, 'actual')}
                      </p>
                    )}
                  </div>
                  
                  {editingBillingInfo && (
                    <div className="flex items-center space-x-3 pt-4 border-t border-gray-200">
                      <button
                        onClick={handleSaveBillingInfo}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="px-4 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          {/* Additional Information */}
          {job.special_requirements && (
             <div className="bg-white rounded-lg shadow-sm border p-6 xl:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center border-b border-gray-200 pb-3">
                <BuildingOfficeIcon className="h-5 w-5 mr-2 text-blue-600" />
                Special Requirements
              </h3>
              <p className="text-sm text-gray-900">{job.special_requirements}</p>
            </div>
          )}
            </div>
          </div>

          {/* Right Column - Email History and SMS */}
          <div className="w-full xl:w-[32rem] space-y-8">
            {/* Email History */}
            <div>
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="border-b border-gray-200">
                <div className="p-6">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => {
                      setEmailsExpanded(!emailsExpanded);
                      if (!emailsExpanded && jobEmails.length === 0) {
                        loadJobEmails();
                      }
                    }}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <EnvelopeIcon className="h-5 w-5 mr-2 text-blue-600" />
                      Email History
                      {jobEmails.length > 0 && (
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                          {jobEmails.length}
                        </span>
                      )}
                    </h3>
                    {emailsExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
              
              {emailsExpanded && (
                <div className="p-6">
                  {loadingEmails ? (
                    <div className="flex items-center justify-center p-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : jobEmails.length === 0 ? (
                    <div className="text-center py-8">
                      <EnvelopeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No emails sent for this job</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {jobEmails.map((email) => (
                        <div key={email.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  email.status === 'sent' ? 'bg-green-100 text-green-800' :
                                  email.status === 'failed' ? 'bg-red-100 text-red-800' :
                                  email.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {email.status}
                                </span>
                                <span className="text-sm font-medium text-gray-900">
                                  {email.email_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">{email.subject}</p>
                              <p className="text-xs text-gray-500">
                                To: {email.recipient_name} ({email.recipient_email})
                              </p>
                              {email.sent_at && (
                                <p className="text-xs text-gray-500">
                                  Sent: {new Date(email.sent_at).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setSelectedEmail(email);
                                setShowEmailModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              View Details
                            </button>
                          </div>
                          {email.error_message && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                              <strong>Error:</strong> {email.error_message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

            {/* SMS Chat */}
            <div>
              <SMSChatBox jobId={jobId} jobData={job} />
            </div>

            {/* Job Notes */}
            <div>
              <JobNotes jobId={jobId} />
            </div>

            {/* Invoice PDF - Only show for billed jobs */}
            {job && job.status === 'billed' && (
              <div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <DocumentTextIcon className="h-5 w-5 mr-2 text-green-600" />
                      Invoice
                    </h3>
                  </div>
                  
                  <div className="text-center py-4">
                    <DocumentTextIcon className="h-12 w-12 mx-auto text-green-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-4">
                      This job has been billed. View the invoice PDF below.
                    </p>
                    
                    <button
                      onClick={handleViewInvoicePDF}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <DocumentTextIcon className="h-4 w-4 mr-2" />
                      View Invoice PDF
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Change Interpreter Modal */}
        {showChangeInterpreterModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Change Interpreter</h3>
                <button
                  onClick={handleCloseChangeInterpreterModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Interpreter
                  </label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                    {job.interpreter_name || 'No interpreter assigned'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Interpreter
                  </label>
                  {loadingInterpreters ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : (
                    <select
                      value={selectedInterpreterId}
                      onChange={(e) => setSelectedInterpreterId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select an interpreter...</option>
                      {availableInterpreters.map((interpreter) => (
                        <option key={interpreter.id} value={interpreter.id}>
                          {interpreter.first_name} {interpreter.last_name} - {interpreter.languages}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Change (Optional)
                  </label>
                  <textarea
                    value={changeReason}
                    onChange={(e) => setChangeReason(e.target.value)}
                    placeholder="e.g., Original interpreter cancelled, better match found, etc."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={handleCloseChangeInterpreterModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmChangeInterpreter}
                  disabled={!selectedInterpreterId || changingInterpreter}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {changingInterpreter ? 'Changing...' : 'Change Interpreter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Assign Interpreter Modal */}
        {showAssignInterpreter && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Assign Interpreter</h3>
                <button
                  onClick={handleCloseAssignInterpreterModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Select Existing Interpreter */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-gray-900">Select Existing Interpreter</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose from Available Interpreters
                    </label>
                    {loadingInterpreters ? (
                      <div className="flex items-center justify-center p-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      </div>
                    ) : (
                      <select
                        value={selectedInterpreterForAssignment}
                        onChange={(e) => setSelectedInterpreterForAssignment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select an interpreter...</option>
                        {availableInterpreters.map((interpreter) => (
                          <option key={interpreter.id} value={interpreter.id}>
                            {interpreter.first_name} {interpreter.last_name} - {interpreter.languages}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  {availableInterpreters.length === 0 && !loadingInterpreters && (
                    <div className="text-center py-4 text-gray-500">
                      <p>No available interpreters found for this job.</p>
                      <p className="text-sm mt-1">Create a new interpreter below.</p>
                    </div>
                  )}
                </div>

                {/* Create New Interpreter */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-gray-900">Create New Interpreter</h4>
                    <button
                      onClick={() => setShowCreateInterpreter(!showCreateInterpreter)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                    >
                      {showCreateInterpreter ? 'Hide Form' : 'Show Form'}
                    </button>
                  </div>

                  {showCreateInterpreter && (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {/* Basic Information */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">First Name *</label>
                          <input
                            type="text"
                            value={newInterpreter.first_name}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, first_name: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Last Name *</label>
                          <input
                            type="text"
                            value={newInterpreter.last_name}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, last_name: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Email *</label>
                          <input
                            type="email"
                            value={newInterpreter.email}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                          <input
                            type="tel"
                            value={newInterpreter.phone}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                          <input
                            type="text"
                            value={newInterpreter.city}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, city: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">State</label>
                          <select
                            value={newInterpreter.state_id}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, state_id: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            <option value="">Select State</option>
                            {availableStates.map((state) => (
                              <option key={state.id} value={state.id}>{state.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">ZIP Code</label>
                          <input
                            type="text"
                            value={newInterpreter.zip_code}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, zip_code: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Years of Experience</label>
                          <input
                            type="number"
                            value={newInterpreter.years_of_experience}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, years_of_experience: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Hourly Rate</label>
                          <input
                            type="number"
                            step="0.01"
                            value={newInterpreter.hourly_rate}
                            onChange={(e) => setNewInterpreter(prev => ({ ...prev, hourly_rate: e.target.value }))}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Languages */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-xs font-medium text-gray-700">Languages</label>
                          <button
                            onClick={handleAddLanguage}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            + Add Language
                          </button>
                        </div>
                        {newInterpreter.languages.map((lang, index) => (
                          <div key={index} className="flex items-center space-x-2 mb-2">
                            <select
                              value={lang.language_id}
                              onChange={(e) => handleLanguageChange(index, 'language_id', e.target.value)}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="">Select Language</option>
                              {availableLanguages.map((language) => (
                                <option key={language.id} value={language.id}>{language.name}</option>
                              ))}
                            </select>
                            <select
                              value={lang.proficiency_level}
                              onChange={(e) => handleLanguageChange(index, 'proficiency_level', e.target.value)}
                              className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="fluent">Fluent</option>
                              <option value="native">Native</option>
                              <option value="conversational">Conversational</option>
                              <option value="basic">Basic</option>
                            </select>
                            <input
                              type="checkbox"
                              checked={lang.is_primary}
                              onChange={(e) => handleLanguageChange(index, 'is_primary', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-xs text-gray-600">Primary</span>
                            {newInterpreter.languages.length > 1 && (
                              <button
                                onClick={() => handleRemoveLanguage(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={handleCreateInterpreter}
                        disabled={creatingInterpreter}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
                      >
                        {creatingInterpreter ? 'Creating...' : 'Create Interpreter'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t">
                <button
                  onClick={handleCloseAssignInterpreterModal}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAssignInterpreter}
                  disabled={!selectedInterpreterForAssignment || assigningInterpreter}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {assigningInterpreter ? 'Assigning...' : 'Assign Interpreter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Email Details Modal */}
        {showEmailModal && selectedEmail && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Email Details</h3>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedEmail.status === 'sent' ? 'bg-green-100 text-green-800' :
                        selectedEmail.status === 'failed' ? 'bg-red-100 text-red-800' :
                        selectedEmail.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedEmail.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmail.email_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recipient</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmail.recipient_name} ({selectedEmail.recipient_email})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sent At</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedEmail.sent_at ? new Date(selectedEmail.sent_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subject</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedEmail.subject}</p>
                </div>
                
                {selectedEmail.error_message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Error Message</label>
                    <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">{selectedEmail.error_message}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email Content</label>
                  <div className="mt-1 border border-gray-300 rounded-md p-4 max-h-96 overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: selectedEmail.content }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SMS Details Modal */}
        {showSmsModal && selectedSms && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">SMS Details</h3>
                <button
                  onClick={() => setShowSmsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedSms.status === 'sent' ? 'bg-green-100 text-green-800' :
                        selectedSms.status === 'delivered' ? 'bg-blue-100 text-blue-800' :
                        selectedSms.status === 'failed' ? 'bg-red-100 text-red-800' :
                        selectedSms.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedSms.status}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSms.sms_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Recipient</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSms.recipient_name || 'N/A'} ({selectedSms.recipient_phone})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sent At</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSms.sent_at ? new Date(selectedSms.sent_at).toLocaleString() : 'N/A'}</p>
                  </div>
                </div>
                
                {selectedSms.job_number && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Related Job</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedSms.job_number} - {selectedSms.job_title}</p>
                  </div>
                )}
                
                {selectedSms.twilio_message_sid && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Twilio Message SID</label>
                    <p className="mt-1 text-sm text-gray-900 font-mono">{selectedSms.twilio_message_sid}</p>
                  </div>
                )}
                
                {selectedSms.error_message && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Error Message</label>
                    <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">{selectedSms.error_message}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message Content</label>
                  <div className="mt-1 border border-gray-300 rounded-md p-4 bg-gray-50">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedSms.message}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* External Registry Search Modal */}
        {showExternalRegistrySearch && 
         getServiceCategoryDisplayName(job) === 'Medical Certified' && (
          <ExternalRegistrySearch
            jobRequirements={{
              language: job?.source_language_name || '',
              state: job?.location_state || '',
              city: job?.location_city || '',
              zipCode: job?.location_zip_code || '',
              serviceCategory: getServiceCategoryDisplayName(job)
            }}
            onInterpreterSelect={handleExternalInterpreterSelect}
            onClose={() => setShowExternalRegistrySearch(false)}
          />
        )}

        {/* Appointment Audit Logs Modal */}
        <AppointmentAuditLogs
          jobId={jobId}
          isOpen={showAuditLogs}
          onClose={() => setShowAuditLogs(false)}
        />
      </div>
    </div>
  );
};

export default JobDetails;
