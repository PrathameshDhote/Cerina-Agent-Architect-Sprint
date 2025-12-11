import { useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { protocolApi } from '../services/api';
import { useProtocolStore } from '../store/protocolStore';
import type { GenerateRequest, ResumeRequest, ProtocolState } from '../types/protocol';

export const useProtocol = (threadId?: string) => {
  const queryClient = useQueryClient();
  const { setCurrentProtocol, setIsGenerating, setError } = useProtocolStore();

  // Fetch protocol state
  const {
    data: protocol,
    isPending: isLoading,
    error: queryError,
    refetch,
  } = useQuery<ProtocolState>({
    queryKey: ['protocol', threadId],
    queryFn: () => protocolApi.getState(threadId!),
    enabled: !!threadId,
    refetchInterval: (query) => {
      // Auto-refetch every 5 seconds if in progress
      const data = query.state.data;
      if (data?.approval_status === 'in_progress') {
        return 5000;
      }
      return false;
    },
  });

  // Handle protocol data changes (replaces onSuccess)
  useEffect(() => {
    if (protocol) {
      setCurrentProtocol(protocol);
      if (protocol.approval_status !== 'in_progress') {
        setIsGenerating(false);
      }
    }
  }, [protocol, setCurrentProtocol, setIsGenerating]);

  // Handle query errors (replaces onError)
  useEffect(() => {
    if (queryError) {
      setError((queryError as any)?.message || 'Failed to fetch protocol');
    }
  }, [queryError, setError]);

  // Generate new protocol
  const generateMutation = useMutation({
    mutationFn: (request: GenerateRequest) => protocolApi.generate(request),
    onSuccess: (data) => {
      setIsGenerating(true);
      // Start polling for the new protocol
      queryClient.invalidateQueries({ queryKey: ['protocol', data.thread_id] });
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to generate protocol');
      setIsGenerating(false);
    },
  });

  // Resume workflow (approve/reject/edit)
  const resumeMutation = useMutation({
    mutationFn: ({ threadId, request }: { threadId: string; request: ResumeRequest }) =>
      protocolApi.resume(threadId, request),
    onSuccess: (_, variables) => {
      // Refetch protocol state after resume
      queryClient.invalidateQueries({ queryKey: ['protocol', variables.threadId] });
      if (variables.request.action === 'reject') {
        setIsGenerating(true);
      }
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Failed to resume workflow');
    },
  });

  // Generate protocol
  const generate = useCallback(
    (request: GenerateRequest) => {
      return generateMutation.mutateAsync(request);
    },
    [generateMutation]
  );

  // Approve protocol
  const approve = useCallback(
    (threadId: string) => {
      return resumeMutation.mutateAsync({
        threadId,
        request: { action: 'approve', thread_id: threadId },
      });
    },
    [resumeMutation]
  );

  // Reject protocol
  const reject = useCallback(
    (threadId: string, feedback: string) => {
      return resumeMutation.mutateAsync({
        threadId,
        request: { action: 'reject', feedback, thread_id: threadId },
      });
    },
    [resumeMutation]
  );

  // Edit protocol
  const edit = useCallback(
    (threadId: string, editedDraft: string, feedback?: string) => {
      return resumeMutation.mutateAsync({
        threadId,
        request: {
          action: 'edit',
          edited_draft: editedDraft,
          feedback,
          thread_id: threadId,
        },
      });
    },
    [resumeMutation]
  );

  return {
    // State
    protocol,
    isLoading,
    error: queryError,

    // Mutations
    generate,
    approve,
    reject,
    edit,

    // Mutation states
    isGenerating: generateMutation.isPending,
    isResuming: resumeMutation.isPending,

    // Utilities
    refetch,
  };
};
