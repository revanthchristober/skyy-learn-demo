import { useEffect, useState, useRef } from 'react';
import { Drill, FlaggedTopic } from '../types';

export interface RealtimeToast {
  id: string;
  message: string;
  type: 'approved' | 'flagged' | 'info';
  timestamp: string;
}

interface UseRealtimeSyncProps {
  onDrillsApproved: (drills: Drill[]) => void;
  onQuestionFlagged: (flag: FlaggedTopic) => void;
}

export function useRealtimeSync({ onDrillsApproved, onQuestionFlagged }: UseRealtimeSyncProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [activeToast, setActiveToast] = useState<RealtimeToast | null>(null);
  const toastTimeoutRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Keep latest callbacks in refs to avoid reconnect loops
  const onApprovedRef = useRef(onDrillsApproved);
  onApprovedRef.current = onDrillsApproved;

  const onFlaggedRef = useRef(onQuestionFlagged);
  onFlaggedRef.current = onQuestionFlagged;

  const showToast = (message: string, type: 'approved' | 'flagged' | 'info') => {
    const toast: RealtimeToast = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setActiveToast(toast);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 4500);
  };

  const dismissToast = () => {
    setActiveToast(null);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
  };

  useEffect(() => {
    let unmounted = false;
    let reconnectTimeout: any = null;

    function getWsUrl(): string {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In Vite dev, connect directly to backend port 3001
      if (window.location.port === '5173') {
        return `${protocol}//${window.location.hostname}:3001/ws`;
      }
      return `${protocol}//${window.location.host}/ws`;
    }

    function connect() {
      if (unmounted) return;

      const url = getWsUrl();
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!unmounted) {
            setIsConnected(true);
            console.log('[Realtime] WebSocket connected to', url);
          }
        };

        ws.onmessage = (event) => {
          if (unmounted) return;
          try {
            const data = JSON.parse(event.data);
            console.log('[Realtime] Received event:', data.type);

            if (data.type === 'DRILLS_APPROVED') {
              if (Array.isArray(data.payload?.drills)) {
                onApprovedRef.current(data.payload.drills);
              }
              showToast('Tutor approved practice set · Unlocked live', 'approved');
            } else if (data.type === 'QUESTION_FLAGGED') {
              if (data.payload?.flag) {
                onFlaggedRef.current(data.payload.flag);
              }
              const note = data.payload.flag?.studentNote;
              const displayNote = note ? `"${note.slice(0, 35)}${note.length > 35 ? '...' : ''}"` : 'Question flagged';
              showToast(`Flag added to agenda: ${displayNote}`, 'flagged');
            }
          } catch (err) {
            console.error('[Realtime] Failed to parse message:', err);
          }
        };

        ws.onclose = () => {
          if (!unmounted) {
            setIsConnected(false);
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        if (!unmounted) {
          setIsConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        }
      }
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    activeToast,
    dismissToast,
    showToast
  };
}
