import React, { useEffect, useState } from 'react';
import useApiRateLimit from '../hooks/useApiRateLimit';
import './ApiRateLimitToast.css';

export default function ApiRateLimitToast() {
  const { remaining, isRateLimited } = useApiRateLimit();
  const { message } = useApiRateLimit();

  if (!isRateLimited) return null;

  return (
    <div className="api-rate-limit-toast">
      <div className="content">
        <strong>Rate limit</strong>
        <div>{message}</div>
      </div>
      <div className="countdown">Retry in {remaining}s</div>
    </div>
  );
}
