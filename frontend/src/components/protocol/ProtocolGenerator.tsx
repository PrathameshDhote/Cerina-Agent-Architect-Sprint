import React, { useState } from 'react';
import { Card, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { useProtocolStore } from '../../store/protocolStore';
import { protocolApi } from '../../services/api';
import { useProtocolHistory } from '../../hooks/useLocalStorage';

export const ProtocolGenerator: React.FC = () => {
  const [userIntent, setUserIntent] = useState('');
  const [maxIterations, setMaxIterations] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    isGenerating,
    currentProtocol,
    setCurrentProtocol,
    setIsGenerating,
    setError: setStoreError
  } = useProtocolStore();

  const { addToHistory } = useProtocolHistory();

  // Example prompts for quick testing
  const examplePrompts = [
    'Create an exposure hierarchy for social anxiety disorder',
    'Design a thought record exercise for depression',
    'Build a behavioral activation schedule for low motivation',
    'Create a cognitive restructuring worksheet for anxiety',
  ];

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!userIntent.trim()) {
      setError('Please enter a clinical intent');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      // Call the streaming endpoint
      const response = await protocolApi.generateStream({
        user_intent: userIntent,
        max_iterations: maxIterations,
        source: 'web',
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let threadId = '';
      let buffer = ''; // Buffer for incomplete lines

      // Read SSE stream
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          console.log('[SSE] Stream completed');
          break;
        }

        // Decode chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by lines
        const lines = buffer.split('\n');

        // Keep last incomplete line in buffer
        buffer = lines.pop() || '';

        // Process complete lines
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[SSE Event]', data);

              switch (data.type) {
                case 'started':
                  threadId = data.thread_id;
                  addToHistory(threadId);
                  setSuccess(`Generation started (Thread: ${threadId.slice(0, 8)}...)`);
                  console.log('[SSE] Generation started:', threadId);
                  break;

                case 'update':
                  // Skip updates with iteration_count = 0
                  if (data.iteration_count === 0) {
                    console.log('[SSE] Skipping initialization update');
                    break;
                  }

                  console.log('[SSE] Agent update:', data.current_agent, 'iteration:', data.iteration_count);

                  // Update protocol state with SSE data
                  setCurrentProtocol(prev => {
                    if (!prev && threadId) {
                      // First update - create initial state
                      // ⭐ FIX: Cast to proper type
                      return {
                        thread_id: threadId || data.thread_id,
                        user_intent: userIntent,
                        current_agent: data.current_agent,
                        iteration_count: data.iteration_count,
                        approval_status: data.approval_status,
                        quality_score: data.quality_score ?? data.metadata?.overall_quality_score ?? 0,
                        safety_flags_count: data.safety_flags_count || 0,
                        critic_feedbacks_count: 0,
                        max_iterations: maxIterations,
                        current_draft: '',
                        final_approved_draft: null,
                        metadata: {},
                        has_blocking_issues: false,
                        is_finalized: false,
                        halted_at_iteration: null,
                        created_at: data.timestamp || new Date().toISOString(),
                        last_modified: data.timestamp || new Date().toISOString(),
                        updated_at: data.timestamp || new Date().toISOString(),
                        halted_at: null,
                        approved_at: null,
                      };
                    } else if (prev) {
                      // Subsequent updates - merge with existing state
                      return {
                        ...prev,
                        current_agent: data.current_agent,
                        iteration_count: data.iteration_count,
                        approval_status: data.approval_status,
                        quality_score: data.quality_score ?? data.metadata?.overall_quality_score ?? prev.quality_score,
                        safety_flags_count: data.safety_flags_count ?? prev.safety_flags_count,
                        updated_at: data.timestamp || new Date().toISOString(),
                        last_modified: data.timestamp || new Date().toISOString(),
                      };
                    }
                    return prev;
                  });

                  break;


                case 'complete':
                  // Final fetch to get complete state with draft content
                  try {
                    console.log('[SSE] Fetching final state...');
                    const finalState = await protocolApi.getState(data.thread_id);

                    // ⭐ FIX: Preserve quality_score from SSE or extract from metadata
                    setCurrentProtocol((prev) => ({
                      ...finalState,
                      // Preserve quality_score from SSE updates if final state doesn't have it
                      quality_score: finalState.quality_score ||
                        finalState.metadata?.overall_quality_score ||
                        prev?.quality_score ||
                        0,
                    }));

                    setSuccess('Protocol generation complete! Ready for review.');
                    console.log('[SSE] Generation complete');
                  } catch (err) {
                    console.error('[SSE] Failed to fetch final state:', err);
                  }
                  setIsGenerating(false);
                  break;

                case 'error':
                  setError(data.error || 'An error occurred during generation');
                  setIsGenerating(false);
                  console.error('[SSE] Error:', data.error);
                  break;

                default:
                  console.log('[SSE] Unknown event type:', data.type);
              }
            } catch (parseError) {
              console.error('[SSE] Failed to parse event data:', parseError, line);
            }
          } else if (line.startsWith('event: ')) {
            // Handle event type lines (optional)
            console.log('[SSE] Event type:', line.slice(7));
          }
        }
      }

      // If stream ends without completion event
      if (isGenerating) {
        setIsGenerating(false);
        if (threadId) {
          // Fetch final state
          try {
            const finalState = await protocolApi.getState(threadId);
            setCurrentProtocol(finalState);
            setSuccess('Generation completed. Check the Viewer tab.');
          } catch (err) {
            console.error('[SSE] Failed to fetch state after stream end:', err);
          }
        }
      }

    } catch (error: any) {
      console.error('[Generation Error]', error);
      setError(error.message || 'Failed to generate protocol');
      setIsGenerating(false);
      setStoreError(error.message);
    }
  };

  const handleExampleClick = (prompt: string) => {
    setUserIntent(prompt);
  };

  const handleClear = () => {
    setUserIntent('');
    setMaxIterations(5);
    setError(null);
    setSuccess(null);
  };

  return (
    <Card>
      <CardHeader
        title="Generate Protocol"
        subtitle="Describe the CBT protocol you want to create"
        icon={
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        }
      />

      <form onSubmit={handleGenerate} className="space-y-6">
        {/* Alerts */}
        {error && (
          <Alert variant="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" onClose={() => setSuccess(null)}>
            {success}
          </Alert>
        )}

        {/* User Intent Input */}
        <Textarea
          label="Clinical Intent"
          placeholder="e.g., Create an exposure hierarchy for agoraphobia with graduated steps from least to most anxiety-provoking situations..."
          value={userIntent}
          onChange={(e) => setUserIntent(e.target.value)}
          rows={6}
          required
          disabled={isGenerating}
          helperText="Describe the therapeutic goal, target condition, and desired outcome"
        />

        {/* Example Prompts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Examples
          </label>
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((prompt, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleExampleClick(prompt)}
                disabled={isGenerating}
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {prompt.slice(0, 40)}...
              </button>
            ))}
          </div>
        </div>

        {/* Max Iterations */}
        <Input
          type="number"
          label="Max Iterations"
          value={maxIterations}
          onChange={(e) => setMaxIterations(Number(e.target.value))}
          min={1}
          max={10}
          disabled={isGenerating}
          helperText="Maximum number of revision cycles (1-10)"
        />

        {/* Agent Info */}
        <div className="bg-cerina-50 border border-cerina-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-cerina-900 mb-2">
            Multi-Agent System
          </h4>
          <div className="grid grid-cols-2 gap-3 text-xs text-cerina-700">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cerina-600 rounded-full"></div>
              <span>CBT Drafter - Content Generation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cerina-600 rounded-full"></div>
              <span>Safety Guardian - Risk Assessment</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cerina-600 rounded-full"></div>
              <span>Clinical Critic - Quality Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-cerina-600 rounded-full"></div>
              <span>Supervisor - Orchestration</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isGenerating}
            disabled={isGenerating}
            className="flex1 bg-blue-600 hover:bg-blue-700 text-white"  // ⭐ ADD THIS
            leftIcon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            }
          >
            {isGenerating ? 'Generating...' : 'Generate Protocol'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={isGenerating}
            className="text-gray-700 hover:bg-gray-100"  // ⭐ ADD THIS
          >
            Clear
          </Button>

        </div>

        {/* Progress Info */}
        {isGenerating && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Agents are working on your protocol...
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {currentProtocol?.current_agent
                    ? `Current: ${currentProtocol.current_agent} (Iteration ${currentProtocol.iteration_count})`
                    : 'Check the Agent Activity panel on the right for live updates'}
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </Card>
  );
};
