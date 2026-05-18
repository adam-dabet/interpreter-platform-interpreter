import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GiftIcon,
  UserPlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ClipboardDocumentIcon,
  EnvelopeIcon,
  UserIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import referralAPI from '../services/referralAPI';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Button from '../components/ui/Button';

const ReferInterpreter = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [referralCode, setReferralCode] = useState('');
  const [formData, setFormData] = useState({ email: '', name: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, referralsRes, codeRes] = await Promise.all([
        referralAPI.getReferralStats(),
        referralAPI.getMyReferrals(),
        referralAPI.getMyReferralCode()
      ]);
      setStats(statsRes.data);
      setReferrals(referralsRes.data || []);
      setReferralCode(codeRes.data?.code || '');
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setSubmitting(true);
      await referralAPI.createReferral(formData.email, formData.name);
      toast.success('Referral sent successfully!');
      setFormData({ email: '', name: '' });
      loadData();
    } catch (error) {
      console.error('Error creating referral:', error);
      toast.error(error.message || 'Failed to create referral');
    } finally {
      setSubmitting(false);
    }
  };

  const copyReferralLink = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/apply?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  const getStatusBadge = (referral) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Sign-up' },
      registered: { color: 'bg-blue-100 text-blue-800', label: `${referral.jobs_completed || 0}/3 Jobs` },
      qualified: { color: 'bg-green-100 text-green-800', label: 'Reward Pending' },
      rewarded: { color: 'bg-purple-100 text-purple-800', label: 'Reward Sent' }
    };
    const config = statusConfig[referral.status] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <GiftIcon className="h-8 w-8 text-blue-600" />
            Refer an Interpreter
          </h1>
          <p className="text-gray-600 mt-2">
            Earn a <span className="font-semibold text-green-600">$100 gift card</span> for every interpreter you refer who completes 3 jobs!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserPlusIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.total_referrals || 0}</p>
                <p className="text-sm text-gray-500">Total Referrals</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats?.qualified_referrals || 0}</p>
                <p className="text-sm text-gray-500">Qualified</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <GiftIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">${stats?.total_earned || 0}</p>
                <p className="text-sm text-gray-500">Total Earned</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <EnvelopeIcon className="h-5 w-5 text-gray-500" />
              Refer Someone
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Their Name (optional)
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Their Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="interpreter@example.com"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send Referral'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium text-gray-700 mb-2">Or share your referral link:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={referralCode ? `${window.location.origin}/apply?ref=${referralCode}` : 'Loading...'}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-600"
                />
                <button
                  onClick={copyReferralLink}
                  disabled={!referralCode}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors"
                  title="Copy link"
                >
                  <ClipboardDocumentIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium text-gray-900">Invite an interpreter</p>
                  <p className="text-sm text-gray-600">Enter their email or share your referral link</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium text-gray-900">They sign up and get approved</p>
                  <p className="text-sm text-gray-600">Your referral completes their profile and gets approved</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium text-gray-900">They complete 3 jobs</p>
                  <p className="text-sm text-gray-600">Track their progress in your referral dashboard</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                  <GiftIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">You get $100!</p>
                  <p className="text-sm text-gray-600">Receive your gift card reward</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-gray-500" />
              Your Referrals
            </h2>
          </div>

          {referrals.length === 0 ? (
            <div className="p-12 text-center">
              <UserPlusIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No referrals yet. Start referring interpreters to earn rewards!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {referrals.map((referral) => (
                <div key={referral.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-full">
                        <UserIcon className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {referral.referred_first_name && referral.referred_last_name
                            ? `${referral.referred_first_name} ${referral.referred_last_name}`
                            : referral.referred_name || referral.referred_email}
                        </p>
                        <p className="text-sm text-gray-500">{referral.referred_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {referral.status === 'registered' && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <BriefcaseIcon className="h-4 w-4" />
                          <span>{referral.jobs_completed || 0}/3 jobs</span>
                        </div>
                      )}
                      {getStatusBadge(referral)}
                    </div>
                  </div>
                  {referral.status === 'registered' && (
                    <div className="mt-3 ml-12">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(((referral.jobs_completed || 0) / 3) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {referral.reward_status === 'sent' && (
                    <div className="mt-2 ml-12">
                      <span className="inline-flex items-center gap-1 text-sm text-green-600">
                        <CheckCircleIcon className="h-4 w-4" />
                        $100 gift card sent!
                      </span>
                    </div>
                  )}
                  {referral.reward_status === 'pending' && referral.status === 'qualified' && (
                    <div className="mt-2 ml-12">
                      <span className="inline-flex items-center gap-1 text-sm text-yellow-600">
                        <ClockIcon className="h-4 w-4" />
                        Reward being processed
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ReferInterpreter;
