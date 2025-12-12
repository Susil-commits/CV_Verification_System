import { useState } from 'react';
import './App.css';
import AuthForms from './components/AuthForms';
import UserPanel from './components/UserPanel';
import AdminPanel from './components/AdminPanel';
import PortalNav from './components/PortalNav';
import AdminLoginForm from './components/AdminLoginForm';
import { authApi } from './services/api';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [info, setInfo] = useState('');
  const [portal, setPortal] = useState(() => {
    const stored = localStorage.getItem('user');
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed?.role === 'admin' ? 'admin' : 'user';
  });

  const handleAuth = async (mode, payload) => {
    if (mode === 'register') {
      await authApi.register(payload);
      setInfo('Account created. Please log in with your new credentials.');
      return;
    }

    const data = await authApi.login(payload);
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    setInfo('');
    setPortal('user');
  };

  const handleAdminLogin = async ({ email, password }) => {
    const data = await authApi.login({ email, password });
    if (data.user.role !== 'admin') {
      throw new Error('This account does not have admin access.');
    }
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    localStorage.setItem('user', JSON.stringify(data.user));
    setInfo('');
    setPortal('admin');
  };

  const handleLogout = () => {
    // Try to ask server to revoke the refresh token before clearing local session
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {
        // If the server call fails, just continue to clear local session
      });
    }
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    // clear transient unsaved state
    try {
      localStorage.removeItem('unsavedCv');
      localStorage.removeItem('adminUnsavedState');
    } catch (e) {
      // ignore
    }
    setInfo('You have been logged out.');
    setPortal('user');
  };

  return (
    <div className="app">
      <header>
        <div>
          <p className="eyebrow">Upload your CV</p>
          <h1>Submit, review, and manage CVs in minutes</h1>
          <p className="subtitle">
            Users submit their professional details while admins review, approve, or reject with a single click.
          </p>
        </div>
        {user && (
          <div className="user-pill">
            <span>{user.email}</span>
            <span className="role">{user.role}</span>
          </div>
        )}
      </header>

      <PortalNav active={portal} onSelect={setPortal} user={user} />

      {info && <p className="info">{info}</p>}

      {portal === 'user' && !token && <AuthForms onAuth={handleAuth} />}

      {portal === 'admin' && !(token && user?.role === 'admin') && (
        <AdminLoginForm onLogin={handleAdminLogin} />
      )}

      {portal === 'user' && token && user?.role === 'user' && (
        <UserPanel token={token} onLogout={handleLogout} />
      )}

      {portal === 'admin' && token && user?.role === 'admin' && (
        <AdminPanel token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
