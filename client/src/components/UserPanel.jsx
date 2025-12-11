import { useEffect, useState } from 'react';
import { cvApi } from '../services/api';
import { useAutoLogout } from '../hooks/useAutoLogout';
import SessionWarning from './SessionWarning';
import SessionStatus from './SessionStatus';
import ActivityTracker from './ActivityTracker';
import SessionProgressBar from './SessionProgressBar';
import IdleIndicator from './IdleIndicator';
import SessionTimer from './SessionTimer';

const emptyCv = {
  fullName: '',
  phone: '',
  address: '',
  education: '',
  experience: '',
  skills: ''
};

export default function UserPanel({ token, onLogout }) {
  const [cv, setCv] = useState(null);
  const [formValues, setFormValues] = useState(emptyCv);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleBeforeLogout = () => {
    // Auto-save form data before logout
    if (formValues && Object.values(formValues).some(v => v)) {
      console.log('Auto-saving form data before logout...');
      // You can add logic to save form data to localStorage or API
    }
  };

  const { showWarning, timeLeft, extendSession, lastActivity, inactiveFor, extensionCount, graceTimer, cancelLogout, isIdle, sessionProgress, performLogout } = useAutoLogout(
    onLogout,
    20 * 60 * 1000,
    3 * 60 * 1000,
    { 
      enableSound: true,
      enableNotification: true,
      graceperiodSeconds: 5,
      trackActivity: true,
      onBeforeLogout: handleBeforeLogout,
      enableKeyboardShortcut: true,  // Ctrl+Shift+L to logout
      enableMultiTabSync: true,      // Sync across tabs
      soundVolume: 0.3
    }
  );

  useEffect(() => {
    let mounted = true;
    const loadCv = async () => {
      try {
        const data = await cvApi.getMine(token);
        if (mounted && data) {
          setCv(data);
          setFormValues({
            fullName: data.fullName,
            phone: data.phone,
            address: data.address,
            education: data.education,
            experience: data.experience,
            skills: data.skills
          });
        }
      } catch (err) {
        setMessage(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadCv();
    return () => {
      mounted = false;
    };
  }, [token]);

  const handleChange = (e) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      let saved;
      if (cv) {
        saved = await cvApi.update(cv._id, formValues, token);
      } else {
        saved = await cvApi.submit(formValues, token);
      }
      setCv(saved);
      setMessage('CV saved successfully.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!cv) return;
    if (!window.confirm('Delete your CV permanently?')) return;
    setSubmitting(true);
    setMessage('');
    try {
      await cvApi.remove(cv._id, token);
      setCv(null);
      setFormValues(emptyCv);
      setMessage('CV deleted.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <p>Loading your CV...</p>;
  }

  const statusMessages = {
    pending: {
      title: 'Your CV is under review',
      body: 'An admin will review your application shortly. You can still edit or delete it while it is pending.'
    },
    approved: {
      title: 'Congratulations! Your CV is approved',
      body: 'Admins approved this submission. If you need to make changes, delete the CV and resubmit an updated version.'
    },
    rejected: {
      title: 'Your CV was rejected',
      body: 'Review your details and consider resubmitting with the required adjustments. You can delete this CV and upload a new one at any time.'
    }
  };

  return (
    <section>
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
      <header className="panel-header">
        <div>
          <h2>User Panel</h2>
          {cv && <span className={`status-badge ${cv.status}`}>{cv.status}</span>}
        </div>
        <div className="header-actions">
          <SessionTimer inactiveFor={inactiveFor} inactivityTimeout={20 * 60 * 1000} />
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

      {cv && (
        <div className={`status-panel ${cv.status}`}>
          <div>
            <p className="eyebrow">{cv.status === 'pending' ? 'In progress' : 'Final decision'}</p>
            <h3>{statusMessages[cv.status].title}</h3>
            <p className="muted">{statusMessages[cv.status].body}</p>
          </div>
          <div className="status-meta">
            <span>Last update</span>
            <strong>{new Date(cv.updatedAt || cv.createdAt).toLocaleString()}</strong>
          </div>
        </div>
      )}

      <form className="card" onSubmit={handleSubmit}>
        <h3>{cv ? 'Update CV (pending only)' : 'Submit your CV'}</h3>
        <div className="grid">
          <label>
            Full name
            <input
              type="text"
              name="fullName"
              value={formValues.fullName}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={120}
              pattern="^[A-Za-z][A-Za-z\s.'-]*$"
              title="Use letters, spaces, apostrophes, periods, or dashes only."
            />
          </label>
          <label>
            Phone
            <input
              type="tel"
              inputMode="tel"
              name="phone"
              value={formValues.phone}
              onChange={handleChange}
              required
              pattern="^\+?[0-9]{7,15}$"
              title="Enter 7-15 digits, optionally starting with +."
            />
          </label>
        </div>
        <label>
          Address
          <input
            type="text"
            name="address"
            value={formValues.address}
            onChange={handleChange}
            required
            minLength={5}
            maxLength={200}
            pattern="^[A-Za-z0-9\s,.'#-]+$"
            title="Use letters, numbers, spaces, commas, period, # or -."
          />
        </label>
        <label>
          Education
          <textarea
            name="education"
            value={formValues.education}
            onChange={handleChange}
            required
            minLength={10}
            maxLength={500}
          />
        </label>
        <label>
          Experience
          <textarea
            name="experience"
            value={formValues.experience}
            onChange={handleChange}
            required
            minLength={10}
            maxLength={1000}
          />
        </label>
        <label>
          Skills
          <textarea
            name="skills"
            value={formValues.skills}
            onChange={handleChange}
            required
            minLength={3}
            maxLength={500}
          />
        </label>
        {message && <p className="info">{message}</p>}
        <div className="actions">
          <button type="submit" disabled={submitting || (cv && cv.status !== 'pending')}>
            {submitting ? 'Saving...' : cv ? 'Update CV' : 'Submit CV'}
          </button>
          {cv && (
            <button type="button" className="danger" disabled={submitting} onClick={handleDelete}>
              Delete CV
            </button>
          )}
        </div>
        {cv && cv.status !== 'pending' && (
          <p className="notice">CV edits disabled once reviewed. You can delete and resubmit.</p>
        )}
      </form>
    </section>
  );
}


