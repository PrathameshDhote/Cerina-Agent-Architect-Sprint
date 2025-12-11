import React from 'react';
import { useProtocolStore } from '../../store/protocolStore';

export const Header: React.FC = () => {
  const { currentProtocol } = useProtocolStore();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left: Title */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Multi-Agent Protocol System
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Autonomous CBT protocol generation with human oversight
          </p>
        </div>

        {/* Right: Status & Actions */}
        <div className="flex items-center gap-4">
          {/* Current Protocol Info */}
          {currentProtocol && currentProtocol.thread_id && (
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-500">Thread ID</p>
                <p className="text-sm font-mono text-gray-900">
                  {/* ⭐ ADD NULL CHECK BEFORE .slice() */}
                  {currentProtocol.thread_id?.slice(0, 8) || 'N/A'}...
                </p>
              </div>

              <div className="w-px h-8 bg-gray-300" />

              <div className="text-right">
                <p className="text-xs font-medium text-gray-500">Status</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StatusBadge status={currentProtocol.approval_status} />
                </div>
              </div>

              <div className="w-px h-8 bg-gray-300" />

              <div className="text-right">
                <p className="text-xs font-medium text-gray-500">Iteration</p>
                <p className="text-sm font-semibold text-gray-900">
                  {currentProtocol.iteration_count} / {currentProtocol.max_iterations}
                </p>
              </div>
            </div>
          )}

          {/* Settings Button */}
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusConfig = {
    in_progress: {
      label: 'In Progress',
      color: 'bg-blue-100 text-blue-700',
      icon: '🔄',
    },
    pending_human_review: {
      label: 'Review Needed',
      color: 'bg-yellow-100 text-yellow-700',
      icon: '⏸️',
    },
    approved: {
      label: 'Approved',
      color: 'bg-green-100 text-green-700',
      icon: '✅',
    },
    rejected: {
      label: 'Rejected',
      color: 'bg-red-100 text-red-700',
      icon: '❌',
    },
    pending: {
      label: 'Pending',
      color: 'bg-gray-100 text-gray-700',
      icon: '⏳',
    },
  };

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.in_progress;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${config.color}`}>
      <span>{config.icon}</span>
      {config.label}
    </span>
  );
};
