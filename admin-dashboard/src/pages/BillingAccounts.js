import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  CreditCardIcon,
  PhoneIcon,
  EnvelopeIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// UI Components
const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '' }) => {
  const baseClasses = 'px-4 py-2 rounded-lg font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ value, onChange, placeholder, type = 'text', className = '', label, required = false }) => (
  <div className={className}>
    {label && (
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
    )}
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
  </div>
);

const BillingAccounts = ({ setCurrentView }) => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [expandedAccount, setExpandedAccount] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  // Service categories and their display names
  const serviceCategories = {
    general: 'General',
    legal: 'Legal',
    medical_certified: 'Medical Certified',
    psychological: 'Psychological',
    routine_visits: 'Routine Visits'
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/billing-accounts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.data || []);
      } else {
        toast.error('Failed to load billing accounts');
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Failed to load billing accounts');
    } finally {
      setLoading(false);
    }
  };

  const loadAccountWithRates = async (accountId) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/billing-accounts/${accountId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.data;
      }
      return null;
    } catch (error) {
      console.error('Error loading account rates:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('adminToken');
      const url = editingAccount 
        ? `${API_BASE}/admin/billing-accounts/${editingAccount.id}`
        : `${API_BASE}/admin/billing-accounts`;
      
      const response = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        setShowModal(false);
        setEditingAccount(null);
        resetForm();
        // Reload accounts and if this was a new account, expand it to show rates
        await loadAccounts();
        if (!editingAccount) {
          // This was a new account, expand it to show the rates
          const newAccountId = result.data.id;
          setExpandedAccount(newAccountId);
          // Load the rates for the new account
          const accountWithRates = await loadAccountWithRates(newAccountId);
          if (accountWithRates) {
            setAccounts(prev => prev.map(acc => 
              acc.id === newAccountId ? accountWithRates : acc
            ));
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save billing account');
      }
    } catch (error) {
      console.error('Error saving account:', error);
      toast.error('Failed to save billing account');
    }
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this billing account? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/billing-accounts/${accountId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Billing account deleted successfully');
        loadAccounts();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete billing account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete billing account');
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name || '',
      phone: account.phone || '',
      email: account.email || ''
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingAccount(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: ''
    });
  };

  const handleRateUpdate = async (accountId, rateId, field, value) => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`${API_BASE}/admin/billing-accounts/${accountId}/rates/${rateId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rate_amount: field === 'rate_amount' ? value : undefined,
          time_minutes: field === 'time_minutes' ? value : undefined
        })
      });

      if (response.ok) {
        toast.success('Rate updated successfully');
        // Reload the expanded account to show updated rates
        if (expandedAccount === accountId) {
          const updatedAccount = await loadAccountWithRates(accountId);
          if (updatedAccount) {
            setAccounts(prev => prev.map(acc => 
              acc.id === accountId ? { ...acc, rates: updatedAccount.rates } : acc
            ));
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update rate');
      }
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Failed to update rate');
    }
  };

  const toggleAccountExpansion = async (accountId) => {
    if (expandedAccount === accountId) {
      setExpandedAccount(null);
    } else {
      setExpandedAccount(accountId);
      // Load rates if not already loaded
      const account = accounts.find(acc => acc.id === accountId);
      if (account && !account.rates) {
        const accountWithRates = await loadAccountWithRates(accountId);
        if (accountWithRates) {
          setAccounts(prev => prev.map(acc => 
            acc.id === accountId ? accountWithRates : acc
          ));
        }
      }
    }
  };

  const filteredAccounts = accounts.filter(account =>
    account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    account.phone?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <CreditCardIcon className="h-8 w-8 mr-3 text-blue-600" />
            Billing Accounts
          </h1>
          <p className="mt-2 text-gray-600">Manage billing accounts and their rate structures</p>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleCreate}
              variant="primary"
              className="flex items-center"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Billing Account
            </Button>
          </div>
          
          <div className="flex items-center space-x-2">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Accounts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="text-center py-12">
            <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No billing accounts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a new billing account.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAccounts.map((account) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Account Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{account.name}</h3>
                        <div className="flex items-center space-x-4 mt-1">
                          {account.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <PhoneIcon className="h-4 w-4 mr-1" />
                              {account.phone}
                            </div>
                          )}
                          {account.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <EnvelopeIcon className="h-4 w-4 mr-1" />
                              {account.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => toggleAccountExpansion(account.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title={expandedAccount === account.id ? 'Collapse Rates' : 'View Rates'}
                      >
                        {expandedAccount === account.id ? (
                          <ChevronUpIcon className="h-5 w-5" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleEdit(account)}
                        className="text-gray-600 hover:text-gray-900"
                        title="Edit Account"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Account"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Rates Section */}
                {expandedAccount === account.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Rate Structure</h4>
                    
                    {!account.rates ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-500">Loading rates...</p>
                      </div>
                    ) : account.rates && account.rates.length > 0 ? (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Rates Column */}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-3">Rates ($)</h5>
                          <div className="space-y-3">
                            {Object.entries(serviceCategories).map(([category, displayName]) => {
                              const categoryRates = account.rates.filter(rate => rate.service_category === category);
                              return (
                                <div key={category} className="bg-white rounded-lg p-4 border">
                                  <h6 className="font-medium text-gray-900 mb-2">{displayName}</h6>
                                  <div className="space-y-2">
                                    {categoryRates.map((rate) => (
                                      <div key={rate.id} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                          {displayName} Rate {rate.rate_type}:
                                        </span>
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={rate.rate_amount}
                                            onChange={(e) => handleRateUpdate(account.id, rate.id, 'rate_amount', parseFloat(e.target.value))}
                                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <PencilIcon className="h-3 w-3 text-gray-400" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Time Column */}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-3">Time (Minutes)</h5>
                          <div className="space-y-3">
                            {Object.entries(serviceCategories).map(([category, displayName]) => {
                              const categoryRates = account.rates.filter(rate => rate.service_category === category);
                              return (
                                <div key={category} className="bg-white rounded-lg p-4 border">
                                  <h6 className="font-medium text-gray-900 mb-2">{displayName}</h6>
                                  <div className="space-y-2">
                                    {categoryRates.map((rate) => (
                                      <div key={rate.id} className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600">
                                          {displayName} Time {rate.rate_type}:
                                        </span>
                                        <div className="flex items-center space-x-2">
                                          <input
                                            type="number"
                                            min="0"
                                            value={rate.time_minutes}
                                            onChange={(e) => handleRateUpdate(account.id, rate.id, 'time_minutes', parseInt(e.target.value))}
                                            className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                          />
                                          <PencilIcon className="h-3 w-3 text-gray-400" />
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500">No rates configured for this account</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingAccount ? 'Edit Billing Account' : 'Add New Billing Account'}
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Account Name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter account name"
                  required
                />
                
                <Input
                  label="Phone Number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(555) 123-4567"
                />
                
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="billing@example.com"
                />
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowModal(false);
                      setEditingAccount(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                  >
                    {editingAccount ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingAccounts;
