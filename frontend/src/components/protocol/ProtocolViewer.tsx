import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useProtocolStore } from '../../store/protocolStore';
import { ApprovalPanel } from './ApprovalPanel';
import ReactMarkdown from 'react-markdown';
import { format, parseISO, isValid } from 'date-fns';

export const ProtocolViewer: React.FC = () => {
  const { currentProtocol } = useProtocolStore();
  const [activeTab, setActiveTab] = useState<'draft' | 'metadata'>('draft');

  if (!currentProtocol) {
    return (
      <Card>
        <div className="text-center py-12 text-gray-500">
          No protocol loaded
        </div>
      </Card>
    );
  }

  const statusConfig = {
    in_progress: { label: 'In Progress', color: 'info' as const, icon: '🔄' },
    pending_human_review: { label: 'Pending Review', color: 'warning' as const, icon: '⏸️' },
    approved: { label: 'Approved', color: 'success' as const, icon: '✅' },
    rejected: { label: 'Rejected', color: 'danger' as const, icon: '❌' },
  };

  const status = statusConfig[currentProtocol.approval_status] || statusConfig.in_progress;

  // Safe date formatting
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'MMM d, yyyy HH:mm') : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  const formatDateLong = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'PPpp') : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  // Safe number formatting
  const qualityScore = currentProtocol.quality_score ?? 0;
  const safetyFlags = currentProtocol.safety_flags_count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Protocol Draft
              </h2>
              <Badge variant={status.color} icon={<span>{status.icon}</span>}>
                {status.label}
              </Badge>
            </div>
            
            <p className="text-gray-600 mb-4">
              {currentProtocol.user_intent}
            </p>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Created: {formatDate(currentProtocol.created_at)}</span>
              </div>

              <div className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Thread: {currentProtocol.thread_id.slice(0, 8)}...</span>
              </div>
            </div>
          </div>

          {/* Quality Metrics */}
          <div className="flex gap-4">
            <MetricCard
              label="Quality"
              value={Math.round(qualityScore * 10)}
              suffix="%"
              color={qualityScore >= 0.7 ? 'green' : qualityScore >= 0.5 ? 'yellow' : 'red'}
            />
            <MetricCard
              label="Iteration"
              value={currentProtocol.iteration_count}
              suffix={`/${currentProtocol.max_iterations}`}
              color="blue"
            />
            <MetricCard
              label="Safety"
              value={safetyFlags}
              suffix=" flags"
              color={safetyFlags === 0 ? 'green' : 'red'}
            />
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('draft')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'draft'
                ? 'border-cerina-600 text-cerina-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Draft Content
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'metadata'
                ? 'border-cerina-600 text-cerina-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Metadata & Stats
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'draft' && (
        <Card>
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{currentProtocol.current_draft || 'No draft available yet...'}</ReactMarkdown>
          </div>
        </Card>
      )}

      {activeTab === 'metadata' && (
        <Card>
          <div className="space-y-6">
            <MetadataSection title="Workflow Information">
              <MetadataRow label="Thread ID" value={currentProtocol.thread_id} mono />
              <MetadataRow label="Status" value={currentProtocol.approval_status} />
              <MetadataRow label="Iteration Count" value={`${currentProtocol.iteration_count} / ${currentProtocol.max_iterations}`} />
              <MetadataRow label="Created At" value={formatDateLong(currentProtocol.created_at)} />
              <MetadataRow label="Updated At" value={formatDateLong(currentProtocol.updated_at)} />
            </MetadataSection>

            <MetadataSection title="Quality Metrics">
              <MetadataRow label="Quality Score" value={`${(qualityScore * 10).toFixed(1)}%`} />
              <MetadataRow label="Safety Flags" value={safetyFlags.toString()} />
              <MetadataRow label="Critic Reviews" value={currentProtocol.critic_feedbacks_count.toString()} />
            </MetadataSection>

            <MetadataSection title="User Intent">
              <p className="text-gray-700">{currentProtocol.user_intent}</p>
            </MetadataSection>
          </div>
        </Card>
      )}

      {/* Approval Panel (only show if pending review) */}
      {currentProtocol.approval_status === 'pending_human_review' && (
        <ApprovalPanel />
      )}
    </div>
  );
};

// Helper Components
const MetricCard: React.FC<{
  label: string;
  value: number;
  suffix: string;
  color: 'green' | 'yellow' | 'red' | 'blue';
}> = ({ label, value, suffix, color }) => {
  const colorStyles = {
    green: 'bg-green-50 text-green-700 border-green-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className={`px-4 py-3 rounded-lg border ${colorStyles[color]}`}>
      <p className="text-xs font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold">
        {value}
        <span className="text-sm font-normal ml-1">{suffix}</span>
      </p>
    </div>
  );
};

const MetadataSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const MetadataRow: React.FC<{ label: string; value: string; mono?: boolean }> = ({
  label,
  value,
  mono,
}) => (
  <div className="flex justify-between py-2 border-b border-gray-100">
    <span className="text-sm font-medium text-gray-600">{label}</span>
    <span className={`text-sm text-gray-900 ${mono ? 'font-mono' : ''}`}>{value}</span>
  </div>
);
