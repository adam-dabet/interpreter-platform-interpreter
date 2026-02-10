import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  StarIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  LightBulbIcon,
  BugAntIcon,
  SparklesIcon,
  ChatBubbleOvalLeftIcon,
  ChevronLeftIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import api from '../services/api';

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

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('form'); // 'form' | 'history'
  const [feedbackList, setFeedbackList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const panelRef = useRef(null);

  // Form state
  const [category, setCategory] = useState('general');
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Don't close if clicking the trigger button
        if (e.target.closest('[data-feedback-trigger]')) return;
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get('/feedback');
      setFeedbackList(response.data.data || []);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setView('form');
  };

  const handleViewHistory = () => {
    setView('history');
    if (feedbackList.length === 0) loadHistory();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (rating === 0) { toast.error('Please select a rating'); return; }
    if (!comment.trim()) { toast.error('Please enter a comment'); return; }

    try {
      setSubmitting(true);
      await api.post('/feedback', { category, rating, comment: comment.trim() });
      toast.success('Feedback submitted! Thank you.');
      setCategory('general');
      setRating(0);
      setComment('');
      // Refresh history if it was loaded
      if (feedbackList.length > 0) loadHistory();
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to submit feedback';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryInfo = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[3];

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });

  return (
    <>
      {/* Floating trigger button */}
      <button
        data-feedback-trigger
        onClick={() => isOpen ? setIsOpen(false) : handleOpen()}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center"
      >
        {isOpen ? (
          <XMarkIcon className="h-6 w-6" />
        ) : (
          <ChatBubbleLeftRightIcon className="h-6 w-6" />
        )}
      </button>

      {/* Popup panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-36 right-4 lg:bottom-20 lg:right-6 z-40 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 180px)' }}
          >
            {/* Header */}
            <div className="bg-blue-600 text-white px-5 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                {view === 'history' && (
                  <button onClick={() => setView('form')} className="hover:bg-blue-500 rounded p-0.5 -ml-1 transition-colors">
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                )}
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
                <h3 className="font-semibold text-sm">
                  {view === 'form' ? 'Send Feedback' : 'Your Feedback'}
                </h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-blue-500 rounded p-1 transition-colors">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {view === 'form' ? (
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        const selected = category === cat.value;
                        return (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => setCategory(cat.value)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                              selected
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Rating</label>
                    <StarRating rating={rating} onRate={setRating} interactive size="h-7 w-7" />
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Your Feedback</label>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      rows={3}
                      maxLength={5000}
                      placeholder="Tell us what's on your mind..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                    />
                    <p className="text-xs text-gray-400 text-right">{comment.length}/5000</p>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting || rating === 0 || !comment.trim()}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
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
                </form>
              ) : (
                /* History view */
                <div className="p-4">
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    </div>
                  ) : feedbackList.length === 0 ? (
                    <p className="text-center text-sm text-gray-500 py-8">No feedback submitted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {feedbackList.map((item) => {
                        const catInfo = getCategoryInfo(item.category);
                        const CatIcon = catInfo.icon;
                        const statusInfo = STATUS_BADGES[item.status] || STATUS_BADGES.new;
                        return (
                          <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-${catInfo.color}-100 text-${catInfo.color}-700`}>
                                <CatIcon className="h-3 w-3" />
                                {catInfo.label}
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.text}`}>
                                {item.status === 'new' && <ClockIcon className="h-3 w-3" />}
                                {item.status === 'reviewed' && <EyeIcon className="h-3 w-3" />}
                                {item.status === 'resolved' && <CheckCircleIcon className="h-3 w-3" />}
                                {statusInfo.label}
                              </span>
                            </div>
                            <StarRating rating={item.rating} size="h-3.5 w-3.5" />
                            <p className="text-sm text-gray-700 mt-1.5 line-clamp-3">{item.comment}</p>
                            <p className="text-xs text-gray-400 mt-1.5">{formatDate(item.created_at)}</p>
                            {item.admin_response && (
                              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100">
                                <p className="text-xs font-medium text-blue-700 mb-0.5">Admin Response</p>
                                <p className="text-xs text-blue-900">{item.admin_response}</p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {view === 'form' && (
              <div className="border-t border-gray-100 px-4 py-2.5 flex-shrink-0">
                <button
                  onClick={handleViewHistory}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  View past feedback
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackWidget;
