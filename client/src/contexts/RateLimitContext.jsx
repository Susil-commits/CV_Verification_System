import React, { createContext, useCallback, useEffect, useState } from 'react';
import { subscribe } from '../utils/rateLimitManager';

export const RateLimitContext = createContext({
  remaining: 0,
  isRateLimited: false,
  message: '',
  setRateLimit: () => {},
  clear: () => {}
});

export function RateLimitProvider({ children }) {
  const [remaining, setRemaining] = useState(0);
  const [message, setMessage] = useState('');

  const setRateLimit = useCallback((detail) => {
    const retryAfter = detail?.retryAfter || 0;
    const secs = Math.max(0, Number(retryAfter) || 0);
    setMessage(detail?.message || 'Too many requests.');
    setRemaining(secs);
  }, []);

  const clear = useCallback(() => {
    setRemaining(0);
    setMessage('');
  }, []);

  useEffect(() => {
    // Subscribe to manager events
    const unsub = subscribe((detail) => {
      setRateLimit(detail);
    });
    return unsub;
  }, [setRateLimit]);

  useEffect(() => {
    let interval;
    if (remaining > 0) {
      interval = setInterval(() => {
        setRemaining((v) => {
          if (v <= 1) {
            clearInterval(interval);
            setMessage('');
            return 0;
          }
          return v - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [remaining]);

  const value = {
    remaining,
    isRateLimited: remaining > 0,
    message,
    setRateLimit,
    clear
  };

  return <RateLimitContext.Provider value={value}>{children}</RateLimitContext.Provider>;
}
