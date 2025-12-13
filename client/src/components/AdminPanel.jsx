import { useEffect, useMemo, useState, useCallback } from 'react';
import { adminApi, authApi } from '../services/api';
import { useAutoLogout } from '../hooks/useAutoLogout';
import SessionWarning from './SessionWarning';
import SessionStatus from './SessionStatus';
import ActivityTracker from './ActivityTracker';
import SessionProgressBar from './SessionProgressBar';
import IdleIndicator from './IdleIndicator';
import SessionTimer from './SessionTimer';
import useApiRateLimit from '../hooks/useApiRateLimit';
import useRealtimeNotifications from '../hooks/useRealtimeNotifications';
import RealtimeToast from './RealtimeToast';

export default function AdminPanel({ token, onLogout }) {
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [toasts, setToasts] = useState([]);
  
  const { remaining: rateLimitRemaining, isRateLimited } = useApiRateLimit();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.list(token);
      setCvs(data);
      if (selected) {
        const refreshed = data.find((cv) => cv._id === selected._id);
        setSelected(refreshed || null);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  }, [token, selected]);

  const handleBeforeLogout = useCallback(async () => {
    // Auto-save any pending changes
    console.log('Auto-saving session data before logout...');
    try {
      // Optionally call an API to save any transient admin state; for now, just attempt a refresh of the list
      await load();
    } catch (err) {
      console.warn('Error auto-saving before logout:', err);
    }

    // Revoke the refresh token server-side for added security
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.warn('Error revoking refresh token on logout:', err);
    }
  }, [load]);

  const handleBeforeUnload = useCallback(() => {
    try {
      // Optionally persist admin UI state
      try {
        const snapshot = { selectedId: selected?._id ?? null, search, statusFilter };
        localStorage.setItem('adminUnsavedState', JSON.stringify(snapshot));
      } catch (e) {
        // ignore
      }

      // Revoke refresh token via sendBeacon to ensure server-side revocation during unload.
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken && typeof navigator.sendBeacon === 'function') {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const url = `${apiBase}/api/auth/logout`;
        const payload = JSON.stringify({ refreshToken });
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
      }
    } catch (err) {
      console.warn('Error in admin beforeunload handler:', err);
    }
  }, [selected, search, statusFilter]);

  const { showWarning, timeLeft, extendSession, lastActivity, inactiveFor, extensionCount, graceTimer, cancelLogout, isIdle, sessionProgress } = useAutoLogout(
    onLogout,
    5 * 60 * 1000,
    60 * 1000,
    { 
      enableSound: true,
      enableNotification: true,
      graceperiodSeconds: 5,
      trackActivity: true,
      onBeforeLogout: handleBeforeLogout,
      onBeforeUnload: handleBeforeUnload,
      enableKeyboardShortcut: true,  // Ctrl+Shift+L to logout
      enableMultiTabSync: true,      // Sync across tabs
      soundVolume: 0.3
    }
  );

  useEffect(() => {
    // Restore any unsaved admin UI state from previous unload
    try {
      const saved = localStorage.getItem('adminUnsavedState');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed) {
          if (parsed.selectedId) setSelected({ _id: parsed.selectedId });
          if (parsed.search) setSearch(parsed.search);
          if (parsed.statusFilter) setStatusFilter(parsed.statusFilter);
        }
        localStorage.removeItem('adminUnsavedState');
      }
    } catch (e) {
      // ignore
    }
    load();
  }, [load]);

  // Realtime notification handler
  const onRealtimeEvent = useCallback((type, payload) => {
    if (!type) return;
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    if (type === 'cv:created') {
      // Refresh the list from server to ensure complete data
      load();
      setToasts((t) => [{ id, title: 'New CV submitted', message: `${payload.fullName} submitted a CV`, ts: Date.now() }, ...t]);
    }
    if (type === 'cv:updated') {
      load();
      setToasts((t) => [{ id, title: 'CV updated', message: `${payload.fullName} updated their CV`, ts: Date.now() }, ...t]);
    }
    if (type === 'cv:statusUpdated') {
      load();
      setToasts((t) => [{ id, title: 'CV status changed', message: `CV ${payload._id} status: ${payload.status}`, ts: Date.now() }, ...t]);
    }
    // Auto remove toasts after 6s
    setTimeout(() => {
      setToasts((cur) => cur.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  useRealtimeNotifications(onRealtimeEvent, token);

  const stats = useMemo(() => {
    const total = cvs.length;
    const pending = cvs.filter((cv) => cv.status === 'pending').length;
    const approved = cvs.filter((cv) => cv.status === 'approved').length;
    const rejected = cvs.filter((cv) => cv.status === 'rejected').length;
    return [
      { label: 'Total CVs', value: total },
      { label: 'Pending', value: pending },
      { label: 'Approved', value: approved },
      { label: 'Rejected', value: rejected }
    ];
  }, [cvs]);

  const filtered = useMemo(() => {
    return cvs
      .filter((cv) => (statusFilter === 'all' ? true : cv.status === statusFilter))
      .filter((cv) => {
        if (!search) return true;
        const target = `${cv.fullName} ${cv.user?.email ?? ''} ${cv.skills} ${cv.education} ${cv.experience}`.toLowerCase();
        return target.includes(search.toLowerCase());
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [cvs, search, statusFilter]);

  const changeStatus = async (id, status) => {
    try {
      await adminApi.updateStatus(id, status, token);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const removeCv = async (id) => {
    if (!window.confirm('Delete this CV?')) return;
    try {
      await adminApi.remove(id, token);
      await load();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <section className="admin-layout">
      <RealtimeToast toasts={toasts} removeToast={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
      {showWarning && timeLeft !== null && (
        <SessionWarning
          timeLeft={timeLeft}
          onExtend={extendSession}
          onLogout={onLogout}
          lastActivity={lastActivity}
          graceTimer={graceTimer}
          onCancelLogout={cancelLogout}
        />
      )}
      <div>
        <header className="panel-header">
          <div>
            <h2>Admin Panel</h2>
            <p className="muted">Review and manage CV submissions</p>
          </div>
          <div className="header-actions">
            <SessionTimer inactiveFor={inactiveFor} inactivityTimeout={5 * 60 * 1000} />
            <button className="link" onClick={onLogout}>
              Logout
            </button>
            <span className="shortcut-hint" title="Ctrl+Shift+L">⌨️</span>
          </div>
        </header>

        <IdleIndicator isIdle={isIdle} />
        <SessionProgressBar progress={sessionProgress} isIdle={isIdle} />
        <SessionStatus showWarning={showWarning} timeLeft={timeLeft} />

        <ActivityTracker lastActivity={lastActivity} inactiveFor={inactiveFor} extensionCount={extensionCount} />

        <div className="stat-grid">
          {stats.map((item) => (
            <article key={item.label} className="stat-card">
              <p className="muted">{item.label}</p>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>

        <div className="filter-bar">
          <div className="segmented">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                className={statusFilter === status ? 'active' : ''}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? 'All' : status[0].toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <input
            type="search"
            placeholder="Search name, email, skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button onClick={load} disabled={isRateLimited}>{isRateLimited ? `Refresh (wait ${rateLimitRemaining}s)` : 'Refresh'}</button>
        </div>

        {message && <p className="error">{message}</p>}

        {loading ? (
          <p>Loading CVs...</p>
        ) : filtered.length === 0 ? (
          <p>No submissions match your filters.</p>
        ) : (
          <div className="cv-grid">
            {filtered.map((cv) => (
              <article
                key={cv._id}
                className={`cv-card ${selected?._id === cv._id ? 'active' : ''}`}
                onClick={() => setSelected(cv)}
              >
                <div className="cv-card-header">
                  <div>
                    <h3>{cv.fullName}</h3>
                    <p className="muted">{cv.user?.email}</p>
                  </div>
                  <span className={`status-badge ${cv.status}`}>{cv.status}</span>
                </div>
                <p className="cv-snippet">{(cv.experience || '').slice(0, 120)}...</p>
                <div className="cv-tags">
                  {cv.skills
                    .split(',')
                    .slice(0, 3)
                    .map((skill) => (
                      <span key={skill} className="chip">
                        {skill.trim()}
                      </span>
                    ))}
                </div>
                <div className="card-actions">
                  <button onClick={(e) => { e.stopPropagation(); changeStatus(cv._id, 'approved'); }}>
                    Approve
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); changeStatus(cv._id, 'rejected'); }}>
                    Reject
                  </button>
                  <button
                    className="danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeCv(cv._id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <aside className={`detail-panel ${selected ? 'visible' : ''}`}>
        {selected ? (
          <>
            <div className="detail-top">
              <div>
                <p className="eyebrow">Candidate</p>
                <h3>{selected.fullName}</h3>
                <p className="muted">{selected.user?.email}</p>
              </div>
              <button className="link" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>
                  <span className={`status-badge ${selected.status}`}>{selected.status}</span>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{selected.phone}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{selected.address}</dd>
              </div>
              <div>
                <dt>Education</dt>
                <dd>{selected.education}</dd>
              </div>
              <div>
                <dt>Experience</dt>
                <dd>{selected.experience}</dd>
              </div>
              <div>
                <dt>Skills</dt>
                <dd>{selected.skills}</dd>
              </div>
            </dl>
            <div className="detail-actions">
              <button onClick={() => changeStatus(selected._id, 'approved')}>Approve</button>
              <button onClick={() => changeStatus(selected._id, 'rejected')}>Reject</button>
              <button className="danger" onClick={() => removeCv(selected._id)}>
                Delete
              </button>
            </div>
            <p className="muted">
              Need deeper insight? Open MongoDB Compass and inspect the `cvs` collection to view raw documents or
              aggregation statistics.
            </p>
          </>
        ) : (
          <p>Select a CV to see the full breakdown.</p>
        )}
      </aside>
    </section>
  );
}


