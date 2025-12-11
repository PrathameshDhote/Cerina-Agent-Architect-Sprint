import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketService } from '../services/websocket';
import type { WebSocketMessage } from '../services/websocket';

interface UseWebSocketOptions {
  url: string;
  enabled?: boolean;
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const {
    url,
    enabled = true,
    reconnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    onOpen,
    onClose,
    onMessage,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !isMountedRef.current) return;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        if (!isMountedRef.current) return;
        
        console.log('[WebSocket] Connected to', url);
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
        onOpen?.();
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          onMessage?.(message);
        } catch (err) {
          console.error('[WebSocket] Failed to parse message:', err);
        }
      };

      ws.onerror = (event) => {
        if (!isMountedRef.current) return;
        
        console.error('[WebSocket] Error:', event);
        setError(event);
        onError?.(event);
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;

        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        onClose?.();

        // Attempt reconnection
        if (reconnect && reconnectAttempts < maxReconnectAttempts) {
          console.log(`[WebSocket] Reconnecting... (${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts((prev) => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
    }
  }, [
    url,
    enabled,
    reconnect,
    reconnectAttempts,
    maxReconnectAttempts,
    reconnectInterval,
    onOpen,
    onClose,
    onMessage,
    onError,
  ]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && isConnected) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }, [isConnected]);

  // Connect on mount or when enabled changes
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [enabled, url]);

  return {
    isConnected,
    lastMessage,
    error,
    reconnectAttempts,
    sendMessage,
    connect,
    disconnect,
  };
};

// Specialized hook for protocol WebSocket
export const useProtocolWebSocket = (threadId: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [error, setError] = useState<Event | null>(null);

  useEffect(() => {
    const ws = new WebSocketService(threadId);

    // Setup handlers
    const unsubscribeMessage = ws.onMessage((message) => {
      setLastMessage(message);
    });

    const unsubscribeOpen = ws.onOpen(() => {
      setIsConnected(true);
      setError(null);
    });

    const unsubscribeClose = ws.onClose(() => {
      setIsConnected(false);
    });

    const unsubscribeError = ws.onError((err) => {
      setError(err);
    });

    // Connect
    ws.connect();

    // Cleanup
    return () => {
      unsubscribeMessage();
      unsubscribeOpen();
      unsubscribeClose();
      unsubscribeError();
      ws.disconnect();
    };
  }, [threadId]);

  return {
    isConnected,
    lastMessage,
    error,
  };
};
