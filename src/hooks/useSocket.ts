'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Report } from './useReportsRealtime';

interface SocketEvents {
  'reports-updated': (data: {
    type: 'initial' | 'new-report' | 'report-expired' | 'reports-list';
    report?: Report;
    reportId?: string;
    reports?: Report[];
  }) => void;
}

export function useSocket() {
  const socketRef = useRef<Socket<SocketEvents> | null>(null);

  const connect = useCallback(() => {
    if (!socketRef.current) {
      socketRef.current = io(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to WebSocket server');
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from WebSocket server');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  const on = useCallback((event: keyof SocketEvents, callback: any) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: keyof SocketEvents, callback: any) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    emit,
    on,
    off
  };
} 