import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useRealtimeNotifications(onEvent, token) {
  const socketRef = useRef(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const socket = io(apiUrl, { auth: { token } });
    socketRef.current = socket;

    socket.on('connect', () => {
      // eslint-disable-next-line no-console
      console.log('Connected to realtime server', socket.id);
    });

    socket.on('cv:created', (payload) => onEvent && onEvent('cv:created', payload));
    socket.on('cv:updated', (payload) => onEvent && onEvent('cv:updated', payload));
    socket.on('cv:statusUpdated', (payload) => onEvent && onEvent('cv:statusUpdated', payload));

    socket.on('disconnect', () => {
      // eslint-disable-next-line no-console
      console.log('Realtime socket disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, [onEvent, token]);

  return { socketRef };
}
