import { useContext } from 'react';
import { RateLimitContext } from '../contexts/RateLimitContext';

export default function useApiRateLimit() {
  const ctx = useContext(RateLimitContext);
  return ctx || { remaining: 0, isRateLimited: false, message: '', setRateLimit: () => {}, clear: () => {} };
}
