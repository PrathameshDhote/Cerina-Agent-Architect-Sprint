/**
 * WebSocket Service for Cerina Protocol Foundry
 * 
 * Provides real-time communication with the backend for:
 * - Live protocol generation updates
 * - Agent activity streaming
 * - State synchronization
 */

export type WebSocketMessageType =
  | 'connection'
  | 'status'
  | 'agent_action'
  | 'draft_update'
  | 'safety_check'
  | 'quality_review'
  | 'halt'
  | 'approval_required'
  | 'workflow_complete'
  | 'error';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: string;
  thread_id?: string;
}

export interface AgentActionMessage {
  agent: string;
  action: string;
  content?: string;
  iteration?: number;
  metadata?: Record<string, any>;
}

export interface StatusMessage {
  approval_status: string;
  iteration_count: number;
  quality_score: number;
  safety_flags_count: number;
}

export interface DraftUpdateMessage {
  draft: string;
  iteration: number;
  quality_score: number;
}

export interface ErrorMessage {
  error: string;
  details?: string;
}

type MessageHandler = (message: WebSocketMessage) => void;
type ErrorHandler = (error: Event) => void;
type ConnectionHandler = () => void;

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectInterval: number = 3000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isIntentionallyClosed: boolean = false;

  // Event handlers
  private messageHandlers: Set<MessageHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();
  private openHandlers: Set<ConnectionHandler> = new Set();
  private closeHandlers: Set<ConnectionHandler> = new Set();

  constructor(threadId: string, baseUrl: string = 'ws://localhost:8000') {
    this.url = `${baseUrl}/ws/${threadId}`;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      console.log(`[WebSocket] Connecting to ${this.url}...`);
      this.ws = new WebSocket(this.url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearReconnectTimeout();

    if (this.ws) {
      console.log('[WebSocket] Disconnecting...');
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to the server
   */
  send(message: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('[WebSocket] Cannot send message - not connected');
      return;
    }

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      this.ws.send(payload);
      console.log('[WebSocket] Message sent:', message);
    } catch (error) {
      console.error('[WebSocket] Failed to send message:', error);
    }
  }

  /**
   * Subscribe to messages
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Subscribe to errors
   */
  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);
    return () => this.errorHandlers.delete(handler);
  }

  /**
   * Subscribe to connection open
   */
  onOpen(handler: ConnectionHandler): () => void {
    this.openHandlers.add(handler);
    return () => this.openHandlers.delete(handler);
  }

  /**
   * Subscribe to connection close
   */
  onClose(handler: ConnectionHandler): () => void {
    this.closeHandlers.add(handler);
    return () => this.closeHandlers.delete(handler);
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  /**
   * Get WebSocket URL
   */
  getUrl(): string {
    return this.url;
  }

  // Private methods

  private handleOpen(): void {
    console.log('[WebSocket] Connected successfully');
    this.reconnectAttempts = 0;
    this.openHandlers.forEach((handler) => handler());
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      console.log('[WebSocket] Message received:', message);

      this.messageHandlers.forEach((handler) => handler(message));
    } catch (error) {
      console.error('[WebSocket] Failed to parse message:', error);
    }
  }

  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
    this.errorHandlers.forEach((handler) => handler(event));
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Connection closed:', event.code, event.reason);
    this.ws = null;
    this.closeHandlers.forEach((handler) => handler());

    // Attempt reconnection if not intentionally closed
    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(
      `[WebSocket] Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval}ms`
    );

    this.reconnectTimeout = setTimeout(() => {
      console.log('[WebSocket] Attempting to reconnect...');
      this.connect();
    }, this.reconnectInterval);
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

/**
 * WebSocket Manager - Singleton pattern for managing multiple connections
 */
class WebSocketManager {
  private connections: Map<string, WebSocketService> = new Map();

  /**
   * Get or create a WebSocket connection for a thread
   */
  getConnection(threadId: string, baseUrl?: string): WebSocketService {
    if (!this.connections.has(threadId)) {
      const service = new WebSocketService(threadId, baseUrl);
      this.connections.set(threadId, service);
    }
    return this.connections.get(threadId)!;
  }

  /**
   * Remove a connection
   */
  removeConnection(threadId: string): void {
    const connection = this.connections.get(threadId);
    if (connection) {
      connection.disconnect();
      this.connections.delete(threadId);
    }
  }

  /**
   * Disconnect all connections
   */
  disconnectAll(): void {
    this.connections.forEach((connection) => connection.disconnect());
    this.connections.clear();
  }

  /**
   * Get all active connections
   */
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys()).filter((threadId) => {
      const connection = this.connections.get(threadId);
      return connection?.isConnected();
    });
  }
}

// Export singleton instance
export const websocketManager = new WebSocketManager();

/**
 * Helper function to create a WebSocket connection
 */
export const createWebSocketConnection = (
  threadId: string,
  baseUrl?: string
): WebSocketService => {
  return websocketManager.getConnection(threadId, baseUrl);
};

/**
 * Helper function to parse typed messages
 */
export const parseWebSocketMessage = <T = any>(
  message: WebSocketMessage
): T => {
  return message.data as T;
};

/**
 * Message type guards
 */
export const isAgentActionMessage = (
  message: WebSocketMessage
): message is WebSocketMessage & { data: AgentActionMessage } => {
  return message.type === 'agent_action';
};

export const isStatusMessage = (
  message: WebSocketMessage
): message is WebSocketMessage & { data: StatusMessage } => {
  return message.type === 'status';
};

export const isDraftUpdateMessage = (
  message: WebSocketMessage
): message is WebSocketMessage & { data: DraftUpdateMessage } => {
  return message.type === 'draft_update';
};

export const isErrorMessage = (
  message: WebSocketMessage
): message is WebSocketMessage & { data: ErrorMessage } => {
  return message.type === 'error';
};

/**
 * React Hook Helper (to be used with useWebSocket hook)
 */
export const createWebSocketHandlers = (threadId: string) => {
  const service = websocketManager.getConnection(threadId);

  return {
    connect: () => service.connect(),
    disconnect: () => service.disconnect(),
    send: (message: any) => service.send(message),
    onMessage: (handler: MessageHandler) => service.onMessage(handler),
    onError: (handler: ErrorHandler) => service.onError(handler),
    onOpen: (handler: ConnectionHandler) => service.onOpen(handler),
    onClose: (handler: ConnectionHandler) => service.onClose(handler),
    isConnected: () => service.isConnected(),
  };
};
