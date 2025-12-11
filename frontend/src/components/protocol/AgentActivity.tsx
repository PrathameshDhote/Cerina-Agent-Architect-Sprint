import React, { useEffect, useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { useProtocolStore } from '../../store/protocolStore';
import { format } from 'date-fns';

interface AgentStatus {
  name: string;
  role: string;
  temperature: number;
  color: string;
  icon: string;
  status: 'idle' | 'active' | 'completed';
  actionCount: number;
  lastAction?: string;
  timestamp?: string;
}

export const AgentActivity: React.FC = () => {
  const { currentProtocol, isGenerating } = useProtocolStore();

  const [agents, setAgents] = useState<AgentStatus[]>([
    {
      name: 'Supervisor',
      role: 'Workflow Orchestrator',
      temperature: 0.3,
      color: 'bg-purple-500',
      icon: '👔',
      status: 'idle',
      actionCount: 0,
    },
    {
      name: 'CBT Drafter',
      role: 'Content Generator',
      temperature: 0.7,
      color: 'bg-blue-500',
      icon: '✍️',
      status: 'idle',
      actionCount: 0,
    },
    {
      name: 'Safety Guardian',
      role: 'Risk Assessment',
      temperature: 0.2,
      color: 'bg-red-500',
      icon: '🛡️',
      status: 'idle',
      actionCount: 0,
    },
    {
      name: 'Clinical Critic',
      role: 'Quality Assurance',
      temperature: 0.5,
      color: 'bg-green-500',
      icon: '⭐',
      status: 'idle',
      actionCount: 0,
    },
  ]);

  // Update agent status based on protocol state changes
  useEffect(() => {
    if (!currentProtocol || !isGenerating) return;

    const currentAgent = currentProtocol.current_agent;
    if (!currentAgent) return;

    console.log('[AgentActivity] Current agent:', currentAgent);

    // Map backend agent names to frontend names
    const agentNameMap: Record<string, string> = {
      'drafter': 'CBT Drafter',
      'safety_guardian': 'Safety Guardian',
      'clinical_critic': 'Clinical Critic',
      'supervisor': 'Supervisor',
    };

    const mappedAgentName = agentNameMap[currentAgent] || currentAgent;

    setAgents((prev) =>
      prev.map((agent) => {
        if (agent.name === mappedAgentName) {
          return {
            ...agent,
            status: 'active' as const,
            actionCount: agent.actionCount + 1,
            lastAction: getAgentAction(currentAgent, currentProtocol),
            timestamp: format(new Date(), 'HH:mm:ss'),
          };
        }
        // Set others to completed if they were active
        if (agent.status === 'active') {
          return { ...agent, status: 'completed' as const };
        }
        return agent;
      })
    );

    // Reset active status after 2 seconds
    const timeout = setTimeout(() => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.name === mappedAgentName && agent.status === 'active'
            ? { ...agent, status: 'completed' as const }
            : agent
        )
      );
    }, 2000);

    return () => clearTimeout(timeout);
  }, [currentProtocol?.current_agent, currentProtocol?.iteration_count, isGenerating]);

  // Reset all agents when generation stops
  useEffect(() => {
    if (!isGenerating) {
      const timeout = setTimeout(() => {
        setAgents((prev) =>
          prev.map((agent) => ({
            ...agent,
            status: 'idle' as const,
            actionCount: 0,
            lastAction: undefined,
            timestamp: undefined,
          }))
        );
      }, 3000); // Wait 3 seconds after generation stops

      return () => clearTimeout(timeout);
    }
  }, [isGenerating]);

  return (
    <Card className="sticky top-6">
      <CardHeader
        title="Agent Activity"
        subtitle={
          isGenerating ? (
            <div className="flex items-center gap-2">
              <Spinner size="sm" />
              <span>Agents are working...</span>
            </div>
          ) : (
            'System ready'
          )
        }
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        }
      />

      {/* Connection Status */}
      {isGenerating && (
        <div className="mb-4 p-3 bg-cerina-50 rounded-lg border border-cerina-200">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-cerina-900 font-medium">
              Live Updates Active
            </span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {agents.map((agent, index) => (
          <AgentCard
            key={agent.name}
            agent={agent}
            delay={index * 200}
          />
        ))}
      </div>

      {/* Workflow Status */}
      {currentProtocol && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Workflow Status</h4>

          <div className="space-y-2">
            <StatusRow
              label="Current Iteration"
              value={`${currentProtocol.iteration_count} / ${currentProtocol.max_iterations}`}
            />
            <StatusRow
              label="Safety Checks"
              value={currentProtocol.safety_flags_count?.toString() || '0'}
              badge={currentProtocol.safety_flags_count === 0 ? 'success' : 'danger'}
            />
            <StatusRow
              label="Quality Reviews"
              value={currentProtocol.critic_feedbacks_count?.toString() || '0'}
            />
            <StatusRow
              label="Quality Score"
              value={`${Math.round((currentProtocol.quality_score ?? 0) * 10)}%`}
              badge={(currentProtocol.quality_score ?? 0) >= 0.7 ? 'success' : 'warning'}
            />
          </div>
        </div>
      )}
    </Card>
  );
};

// Helper function to get agent action description
function getAgentAction(agentName: string, protocol: any): string {
  const actions: Record<string, string> = {
    supervisor: `Evaluating workflow (iteration ${protocol.iteration_count})`,
    drafter: 'Generating protocol draft...',
    safety_guardian: 'Validating safety and liability...',
    clinical_critic: 'Reviewing quality and empathy...',
  };
  return actions[agentName] || 'Processing...';
}

// Agent Card Component
const AgentCard: React.FC<{
  agent: AgentStatus;
  delay: number;
}> = ({ agent, delay }) => {
  const statusColors = {
    idle: 'border-gray-200 bg-white',
    active: 'border-cerina-500 bg-cerina-50 shadow-lg ring-2 ring-cerina-300',
    completed: 'border-green-200 bg-green-50',
  };

  return (
    <div
      className={`p-3 rounded-lg border-2 transition-all duration-300 ${statusColors[agent.status]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 ${agent.color} rounded-lg flex items-center justify-center text-white text-lg ${
            agent.status === 'active' ? 'animate-pulse scale-110' : ''
          } transition-transform duration-300`}
        >
          {agent.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-gray-900">{agent.name}</h4>
            {agent.status === 'active' && (
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-cerina-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-cerina-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-cerina-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            {agent.status === 'completed' && <span className="text-green-600 text-sm">✓</span>}
          </div>
          <p className="text-xs text-gray-600 mb-1">{agent.role}</p>

          {agent.lastAction && agent.status === 'active' && (
            <div className="mt-2 p-2 bg-white rounded border border-cerina-200 animate-pulse">
              <p className="text-xs text-gray-700 font-medium">{agent.lastAction}</p>
              {agent.timestamp && (
                <p className="text-xs text-gray-400 mt-1">{agent.timestamp}</p>
              )}
            </div>
          )}

          {agent.actionCount > 0 && agent.status !== 'active' && (
            <p className="text-xs text-gray-500 mt-1">
              Completed {agent.actionCount} {agent.actionCount === 1 ? 'action' : 'actions'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Status Row Component
const StatusRow: React.FC<{
  label: string;
  value: string;
  badge?: 'success' | 'warning' | 'danger';
}> = ({ label, value, badge }) => {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      {badge ? (
        <Badge variant={badge} size="sm">
          {value}
        </Badge>
      ) : (
        <span className="font-medium text-gray-900">{value}</span>
      )}
    </div>
  );
};
