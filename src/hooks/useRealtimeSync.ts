import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeEvent } from '../types';

export function useRealtimeSync(onEventReceived?: (event: RealtimeEvent) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<RealtimeEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [latestEvent, setLatestEvent] = useState<RealtimeEvent | null>(null);
  const callbackRef = useRef(onEventReceived);

  useEffect(() => {
    callbackRef.current = onEventReceived;
  }, [onEventReceived]);

  // Audio chime for payment verification using Web Audio API (no external sound file needed!)
  const playPaymentChime = useCallback(() => {
    try {
      // Check if sound is muted by user setting
      const isSoundMuted = localStorage.getItem('notification_sound_muted') === 'true';
      if (isSoundMuted) return;

      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Dual tone ascending chime (A5 880Hz -> C#6 1108Hz)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';

      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
      osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.25); // D6

      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.25);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    } catch {
      // Audio playback might be restricted if no user interaction yet
    }
  }, []);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: any = null;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/notifications/stream');

        eventSource.onopen = () => {
          setIsConnected(true);
        };

        eventSource.onmessage = (e) => {
          try {
            const data: RealtimeEvent = JSON.parse(e.data);
            if (data.type === 'connected') return;

            setLatestEvent(data);
            setNotifications((prev) => [data, ...prev].slice(0, 30));
            setUnreadCount((c) => c + 1);

            if (data.type === 'payment_received') {
              playPaymentChime();
            }

            if (callbackRef.current) {
              callbackRef.current(data);
            }
          } catch (err) {
            console.error('Error parsing SSE event:', err);
          }
        };

        eventSource.onerror = () => {
          setIsConnected(false);
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          // Exponential / delayed retry
          retryTimeout = setTimeout(connect, 3500);
        };
      } catch (err) {
        setIsConnected(false);
        retryTimeout = setTimeout(connect, 5000);
      }
    };

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [playPaymentChime]);

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount,
    latestEvent,
    clearUnread,
    clearAllNotifications,
    playPaymentChime,
  };
}
