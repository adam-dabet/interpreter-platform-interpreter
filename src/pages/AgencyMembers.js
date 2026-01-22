import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  UserPlusIcon, 
  UsersIcon, 
  XMarkIcon, 
  TrashIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { interpreterAPI } from '../services/api';
import api from '../services/api';

const AgencyMembers = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [languages, setLanguages] = useState([]);
  const [certifications, setCertifications] = useState([]);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [newMember, setNewMember] = useState({
    first_name: '',
    last_name: '',
    languages: [],
    certifications: []
  });

  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await interpreterAPI.getAgencyMembers();
      if (response.data.success) {
        setMembers(response.data.data.members || []);
      }
    } catch (error) {
      console.error('Error loading agency members:', error);
      toast.error('Failed to load agency members');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadParametricData = useCallback(async () => {
    try {
      const [languagesRes, certificationsRes] = await Promise.all([
        api.get('/parametric/languages'),
        api.get('/parametric/service-types')
      ]);
      
      if (languagesRes.data.success) {
        setLanguages(languagesRes.data.data);
      }
      
      if (certificationsRes.data.success) {
        setCertifications(certificationsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading parametric data:', error);
      toast.error('Failed to load languages and certifications');
    }
  }, []);

  useEffect(() => {
    // Redirect non-agency users
    if (profile && !profile.is_agency) {
      toast.error('This page is only available for agency accounts');
      navigate('/profile');
      return;
    }
    loadMembers();
    loadParametricData();
  }, [profile, navigate, loadMembers, loadParametricData]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    
    if (!newMember.first_name.trim() || !newMember.last_name.trim()) {
      toast.error('Please enter first and last name');
      return;
    }

    if (newMember.languages.length === 0) {
      toast.error('Please select at least one language');
      return;
    }

    if (newMember.certifications.length === 0) {
      toast.error('Please select at least one certification');
      return;
    }

    try {
      setSaving(true);
      const response = await interpreterAPI.createTeamMember(newMember);
      
      if (response.data.success) {
        toast.success('Team member added successfully');
        setShowAddModal(false);
        setNewMember({
          first_name: '',
          last_name: '',
          languages: [],
          certifications: []
        });
        loadMembers(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to add team member');
      }
    } catch (error) {
      console.error('Error adding team member:', error);
      toast.error(error.response?.data?.message || 'Failed to add team member');
    } finally {
      setSaving(false);
    }
  };

  const handleLanguageToggle = (languageId) => {
    setNewMember(prev => ({
      ...prev,
      languages: prev.languages.includes(languageId)
        ? prev.languages.filter(id => id !== languageId)
        : [...prev.languages, languageId]
    }));
  };

  const handleCertificationToggle = (certId) => {
    setNewMember(prev => ({
      ...prev,
      certifications: prev.certifications.includes(certId)
        ? prev.certifications.filter(id => id !== certId)
        : [...prev.certifications, certId]
    }));
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from your agency?`)) {
      return;
    }

    try {
      setRemovingId(memberId);
      const response = await interpreterAPI.removeAgencyMember(memberId);
      
      if (response.data.success) {
        toast.success(`${memberName} has been removed from your agency`);
        loadMembers(); // Refresh the list
      } else {
        toast.error(response.data.message || 'Failed to remove member');
      }
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error(error.message || 'Failed to remove member');
    } finally {
      setRemovingId(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const approvedCount = members.filter(m => m.profile_status === 'approved').length;
  const pendingCount = members.filter(m => m.profile_status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Profile
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agency Members</h1>
              <p className="mt-2 text-sm text-gray-600">
                Manage interpreters in your agency
              </p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <UsersIcon className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Members</p>
                <p className="text-2xl font-bold text-gray-900">{members.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Members List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Team Members</h2>
          </div>
          
          {members.length === 0 ? (
            <div className="p-12 text-center">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No members yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Add team members to your agency by clicking the button above.
              </p>
              <Button 
                onClick={() => setShowAddModal(true)}
                className="mt-6"
              >
                <UserPlusIcon className="h-4 w-4 mr-2" />
                Add Your First Team Member
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {members.map((member) => (
                <motion.li
                  key={member.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center min-w-0">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-indigo-600">
                            {member.first_name?.[0]?.toUpperCase() || '?'}
                            {member.last_name?.[0]?.toUpperCase() || ''}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.first_name} {member.last_name}
                        </p>
                        {member.email && (
                          <p className="text-sm text-gray-500 truncate">{member.email}</p>
                        )}
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          {getStatusBadge(member.profile_status)}
                          {member.languages && member.languages !== 'N/A' && (
                            <span className="text-xs text-gray-500">
                              {member.languages}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={() => handleRemoveMember(member.id, `${member.first_name} ${member.last_name}`)}
                        disabled={removingId === member.id}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                        title="Remove from agency"
                      >
                        {removingId === member.id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <TrashIcon className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Add Team Member Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="flex min-h-screen items-center justify-center p-4">
              <div 
                className="fixed inset-0 bg-black bg-opacity-50"
                onClick={() => !saving && setShowAddModal(false)}
              />
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
                  <button
                    onClick={() => !saving && setShowAddModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                    disabled={saving}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">
                  Add a team member who can perform jobs on behalf of your agency.
                </p>

                <form onSubmit={handleAddMember}>
                  {/* Name Fields */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="first_name"
                        value={newMember.first_name}
                        onChange={(e) => setNewMember(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="John"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={saving}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="last_name"
                        value={newMember.last_name}
                        onChange={(e) => setNewMember(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Doe"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        disabled={saving}
                        required
                      />
                    </div>
                  </div>

                  {/* Languages */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Languages * (select at least one)
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {languages.map(lang => (
                        <label key={lang.id} className="flex items-center py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newMember.languages.includes(lang.id)}
                            onChange={() => handleLanguageToggle(lang.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            disabled={saving}
                          />
                          <span className="ml-3 text-sm text-gray-700">{lang.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certifications * (select at least one)
                    </label>
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {certifications.map(cert => (
                        <label key={cert.id} className="flex items-center py-2 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newMember.certifications.includes(cert.id)}
                            onChange={() => handleCertificationToggle(cert.id)}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            disabled={saving}
                          />
                          <span className="ml-3 text-sm text-gray-700">{cert.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowAddModal(false);
                        setNewMember({
                          first_name: '',
                          last_name: '',
                          languages: [],
                          certifications: []
                        });
                      }}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <LoadingSpinner size="sm" className="mr-2" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="h-4 w-4 mr-2" />
                          Add Team Member
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AgencyMembers;



