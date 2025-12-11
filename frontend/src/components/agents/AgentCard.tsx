import React from 'react';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/Badge';

export interface Agent {
  name: string;
  role: string;
  temperature: number;
  color: string;
  icon: string;
  status: 'idle' | 'active' | 'completed' | 'error';
  lastAction?: string;
  actionCount?: number;
  timestamp?: string;
}

interface AgentCardProps {
  agent: Agent;
  onClick?: () => void;
  className?: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({ agent, onClick, className }) => {
  const statusConfig = {
    idle: {
      badge: 'gray' as const,
      border: 'border-gray-200',
      bg: 'bg-white',
      pulse: false,
    },
    active: {
      badge: 'primary' as const,
      border: 'border-cerina-300',
      bg: 'bg-cerina-50',
      pulse: true,
    },
    completed: {
      badge: 'success' as const,
      border: 'border-green-200',
      bg: 'bg-green-50',
      pulse: false,
    },
    error: {
      badge: 'danger' as const,
      border: 'border-red-200',
      bg: 'bg-red-50',
      pulse: false,
    },
  };

  const config = statusConfig[agent.status];

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative p-4 rounded-xl border-2 transition-all duration-300',
        config.border,
        config.bg,
        config.pulse && 'animate-pulse-slow',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
    >
      {/* Status Indicator */}
      {agent.status === 'active' && (
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cerina-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cerina-600"></span>
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl',
            agent.color
          )}
        >
          {agent.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-gray-900">{agent.name}</h3>
              <p className="text-sm text-gray-600">{agent.role}</p>
            </div>
            <Badge variant={config.badge} size="sm">
              {agent.status}
            </Badge>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Temp: {agent.temperature}</span>
            </div>

            {agent.actionCount !== undefined && (
              <div className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Actions: {agent.actionCount}</span>
              </div>
            )}
          </div>

          {/* Last Action */}
          {agent.lastAction && (
            <div className="mt-3 p-2 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-700 line-clamp-2">{agent.lastAction}</p>
              {agent.timestamp && (
                <p className="text-xs text-gray-400 mt-1">{agent.timestamp}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Compact Agent Card for sidebar/lists
export const AgentCardCompact: React.FC<AgentCardProps> = ({ agent, onClick, className }) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border transition-all',
        agent.status === 'active'
          ? 'border-cerina-300 bg-cerina-50'
          : 'border-gray-200 bg-white hover:bg-gray-50',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-lg',
          agent.color
        )}
      >
        {agent.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-semibold text-gray-900 truncate">{agent.name}</h4>
          {agent.status === 'active' && (
            <div className="w-2 h-2 bg-cerina-600 rounded-full animate-pulse flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-gray-500 truncate">{agent.role}</p>
      </div>

      {/* Action Count */}
      {agent.actionCount !== undefined && (
        <div className="flex-shrink-0 text-xs font-medium text-gray-600">
          {agent.actionCount}
        </div>
      )}
    </div>
  );
};

// Agent Grid Layout
interface AgentGridProps {
  agents: Agent[];
  onAgentClick?: (agent: Agent) => void;
  layout?: 'grid' | 'list';
}

export const AgentGrid: React.FC<AgentGridProps> = ({
  agents,
  onAgentClick,
  layout = 'grid',
}) => {
  if (layout === 'list') {
    return (
      <div className="space-y-2">
        {agents.map((agent) => (
          <AgentCardCompact
            key={agent.name}
            agent={agent}
            onClick={() => onAgentClick?.(agent)}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {agents.map((agent) => (
        <AgentCard
          key={agent.name}
          agent={agent}
          onClick={() => onAgentClick?.(agent)}
        />
      ))}
    </div>
  );
};
