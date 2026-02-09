import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  StarIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  LightBulbIcon,
  BugAntIcon,
  SparklesIcon,
  ChatBubbleOvalLeftIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import api from '../services/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const CATEGORIES = [
  { value: 'suggestion', label: 'Suggestion', icon: LightBulbIcon, color: 'blue' },
  { value: 'bug_report', label: 'Bug Report', icon: BugAntIcon, color: 'red' },
  { value: 'feature_request', label: 'Feature Request', icon: SparklesIcon, color: 'purple' },
  { value: 'general', label: 'General', icon: ChatBubbleOvalLeftIcon, color: 'gray' }
];

const STATUS_BADGES = {
  new: { label: 'New', bg: 'bg-blue-100', text: 'text-blue-700' },
  reviewed: { label: 'Reviewed', bg: 'bg-yellow-100', text: 'text-yellow-700' },
  resolved: { label: 'Resolved', bg: 'bg-green-100', text: 'text-green-700' }
};

const StarRating = ({ rating, onRate, interactive = false, size = 'h-6 w-6' }) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive ? star <= (hovered || rating) : star <= rating;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            {filled ? (
              <StarIconSolid className={`${size} text-yellow-400`} />
            ) : (
              <StarIcon className={`${size} text-gray-300`} />
            )}
          </button>
        );
      })}
    </div>
  );
};

const Feedback = () => {
  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    loadFeedback();
  }, []);

  const loadFeedback = async () => {
    try {
      setLoading(true);
      const response = await api.get('/feedback');
      setFeedbackList(response.data.data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
      toast.error('Failed to load feedback history');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!comment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/feedback', { category, rating, comment: comment.trim() });
      toast.success('Feedback submitted successfully!');

      // Reset form
      setCategory('general');
      setRating(0);
      setComment('');

      // Reload history
      await loadFeedback();
    } catch (error) {
      console.error('Error submitting feedback:', error);
      const message = error.response?.data?.message || 'Failed to submit feedback';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryInfo = (value) => {
    return CATEGORIES.find((c) => c.value === value) || CATEGORIES[3];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Feedback</h1>
          <p className="mt-2 text-gray-600">
            Help us improve the platform. Share your suggestions, report issues, or request new features.
          </p>
        </div>

        {/* Feedback Form */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-blue-600" />
            Submit Feedback
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const selected = category === cat.value;
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        selected
                          ? `border-${cat.color}-500 bg-${cat.color}-50 text-${cat.color}-700`
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Overall Platform Rating
              </label>
              <StarRating rating={rating} onRate={setRating} interactive size="h-8 w-8" />
              {rating > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  {rating === 1 && 'Poor'}
                  {rating === 2 && 'Fair'}
                  {rating === 3 && 'Good'}
                  {rating === 4 && 'Very Good'}
                  {rating === 5 && 'Excellent'}
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Feedback
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Tell us what's on your mind..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{comment.length}/5000</p>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting || rating === 0 || !comment.trim()}
                className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <PaperAirplaneIcon className="h-4 w-4 mr-2" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Feedback History */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Feedback History</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : feedbackList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200"
            >
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
              <p className="text-gray-500 text-sm">No feedback submitted yet. Be the first!</p>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((item, index) => {
                const catInfo = getCategoryInfo(item.category);
                const CatIcon = catInfo.icon;
                const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.new;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm p-5"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {/* Category badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-${catInfo.color}-100 text-${catInfo.color}-700`}>
                          <CatIcon className="h-3.5 w-3.5" />
                          {catInfo.label}
                        </span>
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                          {item.status === 'new' && <ClockIcon className="h-3.5 w-3.5" />}
                          {item.status === 'reviewed' && <EyeIcon className="h-3.5 w-3.5" />}
                          {item.status === 'resolved' && <CheckCircleIcon className="h-3.5 w-3.5" />}
                          {statusInfo.label}
                        </span>
                      </div>
                      <StarRating rating={item.rating} size="h-4 w-4" />
                    </div>

                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.comment}</p>

                    <p className="text-xs text-gray-400 mt-3">{formatDate(item.created_at)}</p>

                    {/* Admin response */}
                    {item.admin_response && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                        <p className="text-xs font-medium text-blue-700 mb-1">Admin Response</p>
                        <p className="text-sm text-blue-900 whitespace-pre-wrap">{item.admin_response}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Feedback;
