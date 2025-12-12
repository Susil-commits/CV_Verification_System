const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    throw new Error(data.message || 'Token refresh failed');
  }

  localStorage.setItem('token', data.token);
  if (data.user) {
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data.token;
}

async function request(path, { token, ...options } = {}) {
  let accessToken = token || localStorage.getItem('token');

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 401 && accessToken && !path.includes('/auth/')) {
    try {
      accessToken = await refreshAccessToken();
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
      });
      const retryData = await retryResponse.json().catch(() => ({}));
      if (!retryResponse.ok) {
        throw new Error(retryData.message || 'Request failed');
      }
      return retryData;
    } catch (refreshError) {
      // Log underlying error for debugging while returning a generic message
      console.warn('Token refresh error:', refreshError);
      throw new Error('Session expired. Please log in again.');
    }
  }

  // Handle Too Many Requests gracefully: include Retry-After if present
  if (response.status === 429) {
    const retryAfter = response.headers.get('Retry-After');
    const waitSeconds = retryAfter ? ` Retry after ${retryAfter} seconds.` : '';
    const json = await response.json().catch(() => ({}));
    const message = json.message || `Too many requests.${waitSeconds}`;
    const err = new Error(message);
    err.retryAfter = retryAfter ? parseInt(retryAfter, 10) : null;
    err.status = 429;
    try {
      const manager = await import('../utils/rateLimitManager');
      if (manager && typeof manager.emitRateLimit === 'function') {
        manager.emitRateLimit({ message, retryAfter: err.retryAfter });
      }
    } catch (e) {
      // ignore
    }
    throw err;
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export const authApi = {
  register: (payload) => request('/api/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload })
  ,logout: (refreshToken) => request('/api/auth/logout', { method: 'POST', body: { refreshToken } })
};

export const cvApi = {
  submit: (payload, token) => request('/api/cv', { method: 'POST', body: payload, token }),
  getMine: (token) => request('/api/cv/me', { method: 'GET', token }),
  update: (id, payload, token) => request(`/api/cv/${id}`, { method: 'PUT', body: payload, token }),
  remove: (id, token) => request(`/api/cv/${id}`, { method: 'DELETE', token })
};

let _adminListPromise = null;
export const adminApi = {
  list: (token) => {
    if (_adminListPromise) return _adminListPromise;
    _adminListPromise = request('/api/admin/cvs', { method: 'GET', token }).finally(() => {
      // Clear the cached promise after a short interval to avoid long-lived cache
      setTimeout(() => { _adminListPromise = null; }, 1000);
    });
    return _adminListPromise;
  },
  updateStatus: (id, status, token) =>
    request(`/api/admin/cvs/${id}/status`, { method: 'PATCH', body: { status }, token }),
  remove: (id, token) => request(`/api/admin/cvs/${id}`, { method: 'DELETE', token })
};


