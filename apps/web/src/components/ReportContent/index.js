/**
 * ReportContent Component
 * Allows users to report inappropriate content in the game
 * Integrates with moderation API
 */

import React, { useState } from 'react';
import { useAccessibility } from '../../hooks/useAccessibility';
import './ReportContent.css';

const ReportContent = ({ contentId, contentType = 'proposal', onClose, onReportSubmitted }) => {
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const { announce, trapFocus } = useAccessibility();

  const reportReasons = [
    { value: 'hate_speech', label: 'Hate Speech or Discrimination' },
    { value: 'harassment', label: 'Harassment or Bullying' },
    { value: 'violence', label: 'Threats of Violence' },
    { value: 'child_safety', label: 'Child Safety Concern' },
    { value: 'spam', label: 'Spam or Misleading Content' },
    { value: 'inappropriate', label: 'Inappropriate Content' },
    { value: 'other', label: 'Other' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!reason) {
      setError('Please select a reason for the report');
      announce('Please select a reason for the report', 'assertive');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/moderation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth header if available
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          contentId,
          reason,
          evidence: evidence.trim() || undefined,
          category: contentType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const result = await response.json();

      setSuccess(true);
      announce('Report submitted successfully', 'polite');

      if (onReportSubmitted) {
        onReportSubmitted(result);
      }

      // Auto-close after success
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);

    } catch (err) {
      setError('Failed to submit report. Please try again.');
      announce('Failed to submit report. Please try again.', 'assertive');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
    }
  };

  React.useEffect(() => {
    announce('Report content dialog opened', 'assertive');

    // Trap focus in the modal
    const modalElement = document.querySelector('.report-content-modal');
    if (modalElement) {
      const cleanup = trapFocus(modalElement);
      return cleanup;
    }
  }, [announce, trapFocus]);

  if (success) {
    return (
      <div className="report-content-modal" role="dialog" aria-labelledby="report-success-title">
        <div className="report-content-content">
          <h2 id="report-success-title">Report Submitted</h2>
          <p>Thank you for helping keep our community safe. Your report has been submitted and will be reviewed by our moderation team.</p>
          <button
            className="report-content-close"
            onClick={onClose}
            aria-label="Close dialog"
            data-close="true"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="report-content-modal"
      role="dialog"
      aria-labelledby="report-title"
      aria-describedby="report-description"
      onKeyDown={handleKeyDown}
    >
      <div className="report-content-content">
        <header className="report-content-header">
          <h2 id="report-title">Report Content</h2>
          <p id="report-description">
            Help us maintain a safe and respectful community by reporting content that violates our guidelines.
          </p>
          <button
            className="report-content-close"
            onClick={onClose}
            aria-label="Close report dialog"
            data-close="true"
          >
            ×
          </button>
        </header>

        <form className="report-content-form" onSubmit={handleSubmit}>
          <div className="report-content-field">
            <label htmlFor="report-reason">Reason for report *</label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              aria-describedby="reason-help"
            >
              <option value="">Select a reason...</option>
              {reportReasons.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <small id="reason-help">Choose the category that best describes the issue</small>
          </div>

          <div className="report-content-field">
            <label htmlFor="report-evidence">Additional details (optional)</label>
            <textarea
              id="report-evidence"
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="Provide any additional context or evidence..."
              rows={4}
              maxLength={1000}
              aria-describedby="evidence-help"
            />
            <small id="evidence-help">
              Maximum 1000 characters. Include links, timestamps, or specific details.
            </small>
          </div>

          {error && (
            <div className="report-content-error" role="alert">
              {error}
            </div>
          )}

          <div className="report-content-actions">
            <button
              type="button"
              className="report-content-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="report-content-submit"
              disabled={isSubmitting || !reason}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>

        <footer className="report-content-footer">
          <p>
            Reports are anonymous and reviewed by our moderation team.
            False reports may result in account restrictions.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default ReportContent;
