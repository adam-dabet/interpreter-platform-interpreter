import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const SMSChatBox = ({ jobId, jobData }) => {
  const [smsMessages, setSmsMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('interpreter');

  useEffect(() => {
    if (expanded) {
      loadSmsMessages();
    }
  }, [expanded, jobId, selectedRecipient]);

  const loadSmsMessages = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      
      const response = await fetch(`${API_BASE}/admin/jobs/${jobId}/sms`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Filter messages based on selected recipient type
        const filteredMessages = data.data.filter(sms => {
          if (selectedRecipient === 'claimant') {
            // Show messages sent to claimant (client_phone)
            const normalizedSmsPhone = normalizePhoneNumber(sms.recipient_phone);
            const normalizedClaimantPhone = normalizePhoneNumber(jobData?.client_phone);
            const matches = normalizedSmsPhone === normalizedClaimantPhone;
            return matches;
          } else {
            // Show messages sent to interpreter (assigned_interpreter_phone)
            const normalizedSmsPhone = normalizePhoneNumber(sms.recipient_phone);
            const normalizedInterpreterPhone = normalizePhoneNumber(jobData?.assigned_interpreter_phone);
            const matches = normalizedSmsPhone === normalizedInterpreterPhone;
            return matches;
          }
        });
        
        // Sort messages by creation time (oldest first)
        const sortedMessages = filteredMessages.sort((a, b) => {
          const timeA = new Date(a.created_at || a.sent_at || 0);
          const timeB = new Date(b.created_at || b.sent_at || 0);
          return timeA - timeB;
        });
        
        setSmsMessages(sortedMessages);
      } else {
        toast.error('Failed to load SMS messages');
      }
    } catch (error) {
      console.error('Error loading SMS messages:', error);
      toast.error('Failed to load SMS messages');
    } finally {
      setLoading(false);
    }
  };

  const sendSMS = async () => {
    if (!newMessage.trim()) return;

    try {
      setSending(true);
      const token = localStorage.getItem('adminToken');
      
      // Determine recipient based on selection
      let recipientPhone, recipientName, recipientId, recipientType;
      
      if (selectedRecipient === 'claimant') {
        recipientPhone = jobData?.client_phone;
        recipientName = jobData?.claimant_first_name && jobData?.claimant_last_name 
          ? `${jobData.claimant_first_name} ${jobData.claimant_last_name}`
          : 'Claimant';
        recipientId = jobData?.claimant_id;
        recipientType = 'claimant';
      } else {
        recipientPhone = jobData?.assigned_interpreter_phone;
        recipientName = jobData?.assigned_interpreter_name || 'Interpreter';
        recipientId = jobData?.assigned_interpreter_id;
        recipientType = 'interpreter';
      }
      
      if (!recipientPhone) {
        toast.error(`No phone number available for ${selectedRecipient === 'claimant' ? 'claimant' : 'interpreter'}`);
        return;
      }


      const response = await fetch(`${API_BASE}/admin/sms/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipientPhone: recipientPhone,
          message: newMessage,
          jobId: jobId,
          recipientName: recipientName,
          smsType: 'manual_message',
          recipientId: recipientId,
          recipientType: recipientType
        })
      });

      if (response.ok) {
        toast.success(`SMS sent successfully to ${recipientName}`);
        setNewMessage('');
        // Reload messages after sending
        await loadSmsMessages();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to send SMS');
      }
    } catch (error) {
      console.error('Error sending SMS:', error);
      toast.error('Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sent':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'delivered':
        return <CheckCircleIcon className="h-4 w-4 text-blue-500" />;
      case 'failed':
        return <XCircleIcon className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'undelivered':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatPhoneNumber = (phone) => {
    if (!phone) return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const normalizePhoneNumber = (phone) => {
    if (!phone) return '';
    // Remove all non-digit characters and ensure it starts with country code
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1${cleaned}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+${cleaned}`;
    }
    return phone;
  };

  const getCurrentPhoneNumber = () => {
    if (selectedRecipient === 'claimant') {
      return jobData?.client_phone;
    } else {
      return jobData?.assigned_interpreter_phone;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border-b border-gray-200">
        <div className="p-5">
          <div 
            className="flex items-center justify-between cursor-pointer group"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  SMS Messaging
                  {smsMessages.length > 0 && (
                    <span className="ml-3 bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {smsMessages.length}
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Send messages to {selectedRecipient === 'claimant' ? 'claimant' : 'interpreter'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex flex-col items-end space-y-1">
                <select
                  value={selectedRecipient}
                  onChange={(e) => setSelectedRecipient(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm border-2 border-gray-200 rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                >
                  <option value="claimant">
                    👤 Claimant {jobData?.client_phone ? `(${formatPhoneNumber(jobData.client_phone)})` : '(No phone)'}
                  </option>
                  <option value="interpreter">
                    🎯 Interpreter {jobData?.assigned_interpreter_phone ? `(${formatPhoneNumber(jobData.assigned_interpreter_phone)})` : '(No phone)'}
                  </option>
                </select>
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-500">Online</span>
                </div>
              </div>
              <div className="transform transition-transform group-hover:scale-105">
                <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {expanded && (
        <div className="p-6">
          {/* Chat Messages */}
          <div className="h-80 overflow-y-auto border-2 border-gray-100 rounded-xl p-6 mb-6 bg-gradient-to-b from-gray-50 to-white shadow-inner">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                  <p className="text-sm text-gray-500">Loading messages...</p>
                </div>
              </div>
            ) : smsMessages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChatBubbleLeftRightIcon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-lg font-medium mb-2">No messages yet</p>
                <p className="text-sm">Start a conversation with the {selectedRecipient === 'claimant' ? 'claimant' : 'interpreter'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {smsMessages.map((sms) => (
                  <div key={sms.id} className="flex flex-col">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center shadow-sm">
                          <ChatBubbleLeftRightIcon className="h-5 w-5 text-green-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl p-4 shadow-md border border-gray-100 hover:shadow-lg transition-shadow">
                          <p className="text-sm text-gray-900 leading-relaxed">{sms.message}</p>
                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50">
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(sms.status)}
                              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {sms.sms_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            </div>
                            <span className="text-xs text-gray-400 font-medium">
                              {formatTime(sms.sent_at)}
                            </span>
                          </div>
                        </div>
                        {sms.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center space-x-1">
                              <XCircleIcon className="h-4 w-4 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">Error: {sms.error_message}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Send Message Form */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">
                Sending to: {selectedRecipient === 'claimant' 
                  ? `👤 Claimant (${jobData?.claimant_first_name} ${jobData?.claimant_last_name})`
                  : `🎯 Interpreter (${jobData?.assigned_interpreter_name})`
                }
              </span>
            </div>
            
            <div className="flex space-x-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Type a message to the ${selectedRecipient}...`}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                  onKeyPress={(e) => e.key === 'Enter' && sendSMS()}
                  disabled={sending || !getCurrentPhoneNumber()}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                </div>
              </div>
              <button
                onClick={sendSMS}
                disabled={sending || !newMessage.trim() || !getCurrentPhoneNumber()}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <PaperAirplaneIcon className="h-5 w-5" />
                )}
                <span className="font-medium">{sending ? 'Sending...' : 'Send'}</span>
              </button>
            </div>
            
            {!getCurrentPhoneNumber() && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 rounded-lg border border-red-200">
                <XCircleIcon className="h-5 w-5 text-red-500" />
                <span className="text-sm text-red-600 font-medium">
                  No phone number available for {selectedRecipient === 'claimant' ? 'claimant' : 'interpreter'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SMSChatBox;
