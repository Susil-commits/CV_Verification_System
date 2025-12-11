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
      throw new Error('Session expired. Please log in again.');
    }
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
};

export const cvApi = {
  submit: (payload, token) => request('/api/cv', { method: 'POST', body: payload, token }),
  getMine: (token) => request('/api/cv/me', { method: 'GET', token }),
  update: (id, payload, token) => request(`/api/cv/${id}`, { method: 'PUT', body: payload, token }),
  remove: (id, token) => request(`/api/cv/${id}`, { method: 'DELETE', token })
};

export const adminApi = {
  list: (token) => request('/api/admin/cvs', { method: 'GET', token }),
  updateStatus: (id, status, token) =>
    request(`/api/admin/cvs/${id}/status`, { method: 'PATCH', body: { status }, token }),
  remove: (id, token) => request(`/api/admin/cvs/${id}`, { method: 'DELETE', token })
};


