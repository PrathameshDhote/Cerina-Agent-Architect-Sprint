export interface ProtocolState {
  thread_id: string;
  user_intent: string;
  current_draft: string;
  approval_status: 'in_progress' | 'pending_human_review' | 'approved' | 'rejected';
  iteration_count: number;
  max_iterations: number;
  quality_score: number;
  safety_flags_count: number;
  critic_feedbacks_count: number;
  created_at: string;
  updated_at: string;
  current_agent?: string;
  metadata?: any;
}

export interface AgentNote {
  agent: string;
  timestamp: string;
  iteration: number;
  content: string;
}

export interface GenerateRequest {
  user_intent: string;
  max_iterations: number;
  source: 'web';
}

export interface GenerateResponse {
  thread_id: string;
  status: string;
  message: string;
}

export interface ResumeRequest {
  action: 'approve' | 'reject' | 'edit';
  feedback?: string;
  edited_draft?: string;
  thread_id: string;
}
