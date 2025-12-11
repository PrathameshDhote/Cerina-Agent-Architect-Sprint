import { useState, useCallback } from 'react';
import type { TimelineEvent } from '../components/agents/AgentTimeline';
import type { Agent } from '../components/agents/AgentCard';

export const useAgentTimeline = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([
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

  // Add event to timeline
  const addEvent = useCallback((event: Omit<TimelineEvent, 'id' | 'timestamp'>) => {
    const newEvent: TimelineEvent = {
      ...event,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    };

    setEvents((prev) => [newEvent, ...prev]);

    // Update agent status and action count
    setAgents((prev) =>
      prev.map((agent) =>
        agent.name === event.agent
          ? {
              ...agent,
              status: 'active' as const,
              lastAction: event.action,
              actionCount: (agent.actionCount || 0) + 1,
              timestamp: new Date().toLocaleTimeString(),
            }
          : agent
      )
    );

    // Reset agent status after 3 seconds
    setTimeout(() => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.name === event.agent
            ? { ...agent, status: 'idle' as const }
            : agent
        )
      );
    }, 3000);
  }, []);

  // Clear all events
  const clearEvents = useCallback(() => {
    setEvents([]);
    setAgents((prev) =>
      prev.map((agent) => ({
        ...agent,
        status: 'idle' as const,
        actionCount: 0,
        lastAction: undefined,
      }))
    );
  }, []);

  // Update agent status manually
  const updateAgentStatus = useCallback(
    (agentName: string, status: Agent['status']) => {
      setAgents((prev) =>
        prev.map((agent) =>
          agent.name === agentName ? { ...agent, status } : agent
        )
      );
    },
    []
  );

  // Simulate workflow for testing
  const simulateWorkflow = useCallback(() => {
    const simulationEvents = [
      {
        agent: 'Supervisor',
        agentIcon: '👔',
        agentColor: 'bg-purple-500',
        action: 'Workflow initiated',
        type: 'decision' as const,
        content: 'Starting CBT protocol generation workflow',
        metadata: { decision: 'Route to Drafter' },
      },
      {
        agent: 'CBT Drafter',
        agentIcon: '✍️',
        agentColor: 'bg-blue-500',
        action: 'Generating protocol draft',
        type: 'draft' as const,
        content: 'Creating exposure hierarchy for social anxiety...',
        metadata: { iteration: 1 },
      },
      {
        agent: 'Safety Guardian',
        agentIcon: '🛡️',
        agentColor: 'bg-red-500',
        action: 'Safety validation',
        type: 'safety' as const,
        content: 'Checking for safety risks and liability concerns...',
        metadata: { safetyFlags: 0 },
      },
      {
        agent: 'Clinical Critic',
        agentIcon: '⭐',
        agentColor: 'bg-green-500',
        action: 'Quality assessment',
        type: 'review' as const,
        content: 'Evaluating clinical quality and empathy...',
        metadata: { qualityScore: 0.85 },
      },
      {
        agent: 'Supervisor',
        agentIcon: '👔',
        agentColor: 'bg-purple-500',
        action: 'Halting for human review',
        type: 'decision' as const,
        content: 'Protocol ready for human approval',
        metadata: { decision: 'Halt' },
      },
    ];

    let delay = 0;
    simulationEvents.forEach((event) => {
      setTimeout(() => {
        addEvent(event);
      }, delay);
      delay += 2000; // 2 seconds between events
    });
  }, [addEvent]);

  return {
    events,
    agents,
    addEvent,
    clearEvents,
    updateAgentStatus,
    simulateWorkflow,
  };
};
