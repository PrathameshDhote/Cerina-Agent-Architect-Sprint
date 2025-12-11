import React from 'react';
import { cn } from '../../utils/cn';
import { format } from 'date-fns';

export interface TimelineEvent {
  id: string;
  agent: string;
  agentIcon: string;
  agentColor: string;
  action: string;
  type: 'draft' | 'review' | 'safety' | 'decision' | 'human';
  content?: string;
  timestamp: string;
  metadata?: {
    iteration?: number;
    qualityScore?: number;
    safetyFlags?: number;
    decision?: string;
  };
}

interface AgentTimelineProps {
  events: TimelineEvent[];
  maxHeight?: string;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  events,
  maxHeight = '600px',
}) => {
  if (events.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <svg
          className="w-12 h-12 mx-auto mb-3 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p>No agent activity yet</p>
      </div>
    );
  }

  return (
    <div className="relative" style={{ maxHeight, overflowY: 'auto' }}>
      {/* Timeline Line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Events */}
      <div className="space-y-6 relative">
        {events.map((event, index) => (
          <TimelineEventItem
            key={event.id}
            event={event}
            isFirst={index === 0}
            isLast={index === events.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

// Timeline Event Item
const TimelineEventItem: React.FC<{
  event: TimelineEvent;
  isFirst: boolean;
  isLast: boolean;
}> = ({ event }) => {
  const typeConfig = {
    draft: {
      color: 'bg-blue-500',
      border: 'border-blue-200',
      bg: 'bg-blue-50',
      label: 'Draft',
    },
    review: {
      color: 'bg-green-500',
      border: 'border-green-200',
      bg: 'bg-green-50',
      label: 'Review',
    },
    safety: {
      color: 'bg-red-500',
      border: 'border-red-200',
      bg: 'bg-red-50',
      label: 'Safety Check',
    },
    decision: {
      color: 'bg-purple-500',
      border: 'border-purple-200',
      bg: 'bg-purple-50',
      label: 'Decision',
    },
    human: {
      color: 'bg-yellow-500',
      border: 'border-yellow-200',
      bg: 'bg-yellow-50',
      label: 'Human Review',
    },
  };

  const config = typeConfig[event.type];

  return (
    <div className="relative pl-16">
      {/* Agent Icon */}
      <div
        className={cn(
          'absolute left-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm z-10',
          event.agentColor
        )}
      >
        {event.agentIcon}
      </div>

      {/* Content Card */}
      <div className={cn('rounded-lg border-2 p-4', config.border, config.bg)}>
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-bold text-gray-900">{event.agent}</h4>
              <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full text-white', config.color)}>
                {config.label}
              </span>
            </div>
            <p className="text-sm text-gray-700 font-medium">{event.action}</p>
          </div>
          <span className="text-xs text-gray-500 whitespace-nowrap">
            {format(new Date(event.timestamp), 'HH:mm:ss')}
          </span>
        </div>

        {/* Content */}
        {event.content && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">
              {event.content}
            </p>
          </div>
        )}

        {/* Metadata */}
        {event.metadata && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs">
            {event.metadata.iteration !== undefined && (
              <MetadataBadge
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
                label={`Iteration ${event.metadata.iteration}`}
              />
            )}

            {event.metadata.qualityScore !== undefined && (
              <MetadataBadge
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                }
                label={`Quality ${Math.round(event.metadata.qualityScore * 100)}%`}
              />
            )}

            {event.metadata.safetyFlags !== undefined && (
              <MetadataBadge
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                }
                label={`${event.metadata.safetyFlags} flags`}
                variant={event.metadata.safetyFlags > 0 ? 'danger' : 'success'}
              />
            )}

            {event.metadata.decision && (
              <MetadataBadge
                icon={
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                }
                label={event.metadata.decision}
                variant="primary"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Metadata Badge
const MetadataBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
  variant?: 'default' | 'success' | 'danger' | 'primary';
}> = ({ icon, label, variant = 'default' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    danger: 'bg-red-100 text-red-700',
    primary: 'bg-cerina-100 text-cerina-700',
  };

  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md font-medium', variants[variant])}>
      {icon}
      {label}
    </span>
  );
};

// Timeline Summary Component
export const TimelineSummary: React.FC<{ events: TimelineEvent[] }> = ({ events }) => {
  const summary = {
    total: events.length,
    drafts: events.filter((e) => e.type === 'draft').length,
    reviews: events.filter((e) => e.type === 'review').length,
    safety: events.filter((e) => e.type === 'safety').length,
    decisions: events.filter((e) => e.type === 'decision').length,
    human: events.filter((e) => e.type === 'human').length,
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <SummaryCard label="Total Events" value={summary.total} color="bg-gray-500" />
      <SummaryCard label="Drafts" value={summary.drafts} color="bg-blue-500" />
      <SummaryCard label="Reviews" value={summary.reviews} color="bg-green-500" />
      <SummaryCard label="Safety Checks" value={summary.safety} color="bg-red-500" />
      <SummaryCard label="Decisions" value={summary.decisions} color="bg-purple-500" />
      <SummaryCard label="Human Actions" value={summary.human} color="bg-yellow-500" />
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: number; color: string }> = ({
  label,
  value,
  color,
}) => (
  <div className="bg-white rounded-lg border border-gray-200 p-3">
    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-white mb-2', color)}>
      <span className="text-lg font-bold">{value}</span>
    </div>
    <p className="text-xs text-gray-600 font-medium">{label}</p>
  </div>
);
