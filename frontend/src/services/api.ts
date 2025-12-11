import axios from 'axios';
import type { GenerateRequest, GenerateResponse, ProtocolState, ResumeRequest } from '../types/protocol';

const API_BASE_URL = 'http://localhost:8000/api';
const API_KEY = 'dev-key-123'; // Add API key constant

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

export const protocolApi = {
  // Generate new protocol (traditional endpoint)
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await api.post<GenerateResponse>('/generate', request);
    return response.data;
  },

  // Generate with streaming (new SSE endpoint)
  async generateStream(request: GenerateRequest): Promise<Response> {
    const response = await fetch(`${API_BASE_URL}/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to start generation: ${response.statusText}`);
    }

    return response;
  },

  // Get protocol state
  async getState(threadId: string): Promise<ProtocolState> {
    const response = await api.get<ProtocolState>(`/state/${threadId}`);
    return response.data;
  },

  // Resume workflow (approve/reject)
  async resume(threadId: string, request: ResumeRequest): Promise<{ status: string }> {
    const response = await api.post(`/resume/${threadId}`, request);
    return response.data;
  },

  // Health check
  async health(): Promise<{ status: string }> {
    const response = await api.get('/health');
    return response.data;
  },
};

export default api;
