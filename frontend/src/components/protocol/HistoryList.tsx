import React from 'react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { useProtocolHistory } from '../../hooks/useLocalStorage';
import { useProtocolStore } from '../../store/protocolStore';
import { protocolApi } from '../../services/api';
import { format, parseISO, isValid } from 'date-fns';

export const HistoryList: React.FC = () => {
  const { history, removeFromHistory } = useProtocolHistory();
  const { setCurrentProtocol } = useProtocolStore();
  const [protocols, setProtocols] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const protocolsData = await Promise.all(
        history.map(async (threadId) => {
          try {
            return await protocolApi.getState(threadId);
          } catch {
            return null;
          }
        })
      );
      setProtocols(protocolsData.filter(Boolean));
      setLoading(false);
    };

    if (history.length > 0) {
      fetchHistory();
    } else {
      setLoading(false);
    }
  }, [history]);

  const handleView = (protocol: any) => {
    setCurrentProtocol(protocol);
  };

  const handleDelete = (threadId: string) => {
    removeFromHistory(threadId);
    setProtocols(protocols.filter(p => p.thread_id !== threadId));
  };

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, 'MMM d, yyyy HH:mm') : 'Invalid date';
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' }> = {
      'approved': { label: 'Approved', variant: 'success' },
      'rejected': { label: 'Rejected', variant: 'danger' },
      'pending_human_review': { label: 'Review Needed', variant: 'warning' },
      'in_progress': { label: 'In Progress', variant: 'info' },
      'pending': { label: 'Pending', variant: 'info' },
      'edited': { label: 'Edited', variant: 'success' },
    };

    return configs[status] || {
      label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      variant: 'info'
    };
  };

  if (loading) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-cerina-600 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">Loading history...</p>
        </div>
      </Card>
    );
  }

  if (protocols.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
          <p className="text-gray-500">Generated protocols will appear here</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {protocols.map((protocol) => {
        const statusConfig = getStatusConfig(protocol.approval_status);

        // ⭐ EXTRACT QUALITY SCORE FROM MULTIPLE LOCATIONS
        const qualityScore = protocol.quality_score ||
          (protocol as any).metadata?.overall_quality_score ||
          0;

        return (
          <div key={protocol.thread_id} onClick={() => handleView(protocol)} className="cursor-pointer">
            <Card hover>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {protocol.user_intent.slice(0, 80)}...
                    </h3>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Thread: {protocol.thread_id.slice(0, 12)}</span>
                    <span>•</span>
                    <span>{formatDate(protocol.created_at)}</span>
                    <span>•</span>
                    <span>Iteration {protocol.iteration_count}/{protocol.max_iterations}</span>
                    <span>•</span>
                    {/* ⭐ USE EXTRACTED QUALITY SCORE */}
                    <span>Quality: {Math.round(qualityScore * 10)}%</span>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(protocol.thread_id);
                  }}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );

};
