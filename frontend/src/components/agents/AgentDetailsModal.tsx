import React from 'react';
import type { Agent } from './AgentCard';
import { cn } from '../../utils/cn';

interface AgentDetailsModalProps {
  agent: Agent | null;
  isOpen: boolean;
  onClose: () => void;
}

export const AgentDetailsModal: React.FC<AgentDetailsModalProps> = ({
  agent,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !agent) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center text-3xl', agent.color)}>
              {agent.icon}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{agent.name}</h2>
              <p className="text-gray-600">{agent.role}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Configuration */}
            <Section title="Configuration">
              <DetailRow label="Temperature" value={agent.temperature.toString()} />
              <DetailRow label="Status" value={agent.status} />
              <DetailRow label="Action Count" value={agent.actionCount?.toString() || '0'} />
            </Section>

            {/* Last Action */}
            {agent.lastAction && (
              <Section title="Last Action">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">{agent.lastAction}</p>
                  {agent.timestamp && (
                    <p className="text-xs text-gray-500 mt-2">{agent.timestamp}</p>
                  )}
                </div>
              </Section>
            )}

            {/* Capabilities */}
            <Section title="Capabilities">
              <ul className="space-y-2">
                {getAgentCapabilities(agent.name).map((capability, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-cerina-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {capability}
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
    {children}
  </div>
);

const DetailRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-100">
    <span className="text-sm font-medium text-gray-600">{label}</span>
    <span className="text-sm text-gray-900">{value}</span>
  </div>
);

const getAgentCapabilities = (agentName: string): string[] => {
  const capabilities: Record<string, string[]> = {
    Supervisor: [
      'Workflow orchestration and routing',
      'Decision making based on state',
      'Managing agent coordination',
      'Determining when to halt for human review',
    ],
    'CBT Drafter': [
      'Generate therapeutic exercises',
      'Create CBT protocols',
      'Revise based on feedback',
      'Ensure clinical accuracy',
    ],
    'Safety Guardian': [
      'Identify safety risks',
      'Detect liability concerns',
      'Validate ethical compliance',
      'Flag inappropriate content',
    ],
    'Clinical Critic': [
      'Evaluate content quality',
      'Assess empathy and tone',
      'Score therapeutic effectiveness',
      'Provide constructive feedback',
    ],
  };

  return capabilities[agentName] || ['No capabilities defined'];
};
