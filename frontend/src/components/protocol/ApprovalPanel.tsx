import React, { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Textarea';
import { Alert } from '../ui/Alert';
import { useProtocolStore } from '../../store/protocolStore';
import { protocolApi } from '../../services/api';

export const ApprovalPanel: React.FC = () => {
  const { currentProtocol, setCurrentProtocol, setIsGenerating } = useProtocolStore();
  const [mode, setMode] = useState<'review' | 'edit'>('review');
  const [feedback, setFeedback] = useState('');
  const [editedDraft, setEditedDraft] = useState(currentProtocol?.current_draft || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!currentProtocol) return null;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await protocolApi.resume(currentProtocol.thread_id, {
        action: 'approve',
        thread_id: currentProtocol.thread_id,
      });

      setSuccess('Protocol approved successfully!');
      
      // Refresh state
      setTimeout(async () => {
        const updatedState = await protocolApi.getState(currentProtocol.thread_id);
        setCurrentProtocol(updatedState);
      }, 1000);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to approve protocol');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback for rejection');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await protocolApi.resume(currentProtocol.thread_id, {
        action: 'reject',
        feedback,
        thread_id: currentProtocol.thread_id,
      });

      setSuccess('Protocol rejected. Agents will revise based on your feedback.');
      setIsGenerating(true);
      
      // Start polling for updates
      pollForUpdates();
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reject protocol');
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!editedDraft.trim()) {
      setError('Edited draft cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await protocolApi.resume(currentProtocol.thread_id, {
        action: 'edit',
        edited_draft: editedDraft,
        feedback: 'User edited the draft',
        thread_id: currentProtocol.thread_id,
      });

      setSuccess('Draft updated and approved!');
      
      // Refresh state
      setTimeout(async () => {
        const updatedState = await protocolApi.getState(currentProtocol.thread_id);
        setCurrentProtocol(updatedState);
        setMode('review');
      }, 1000);
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pollForUpdates = async () => {
    const maxAttempts = 60;
    let attempts = 0;

    const poll = async () => {
      try {
        const state = await protocolApi.getState(currentProtocol.thread_id);
        setCurrentProtocol(state);

        if (state.approval_status !== 'in_progress' || attempts >= maxAttempts) {
          setIsGenerating(false);
          setIsSubmitting(false);
          return;
        }

        attempts++;
        setTimeout(poll, 5000);
      } catch (err) {
        console.error('Polling error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000);
        } else {
          setIsGenerating(false);
          setIsSubmitting(false);
        }
      }
    };

    poll();
  };

  return (
    <Card>
      <CardHeader
        title="Human Review Required"
        subtitle="Review the generated protocol and provide your decision"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
      />

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Mode Selector */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === 'review' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setMode('review')}
          className={mode === 'review' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-700 hover:bg-gray-100'}
        >
          Review Mode
        </Button>
        <Button
          variant={mode === 'edit' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => {
            setMode('edit');
            setEditedDraft(currentProtocol.current_draft);
          }}
          className={mode === 'edit' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-gray-700 hover:bg-gray-100'}
        >
          Edit Mode
        </Button>
      </div>

      {/* Review Mode */}
      {mode === 'review' && (
        <div className="space-y-4">
          <Textarea
            label="Feedback (optional for approval, required for rejection)"
            placeholder="Provide specific feedback about what needs improvement..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={4}
          />

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="success"
              onClick={handleApprove}
              isLoading={isSubmitting}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
              className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
            >
              Approve Protocol
            </Button>

            <Button
              variant="danger"
              onClick={handleReject}
              isLoading={isSubmitting}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              }
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
            >
              Request Revisions
            </Button>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {mode === 'edit' && (
        <div className="space-y-4">
          <Textarea
            label="Edit Draft"
            value={editedDraft}
            onChange={(e) => setEditedDraft(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="primary"
              onClick={handleEdit}
              isLoading={isSubmitting}
              leftIcon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              }
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
            >
              Save & Approve
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                setMode('review');
                setEditedDraft(currentProtocol.current_draft);
              }}
              className="text-gray-700 hover:bg-gray-100 w-full sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
