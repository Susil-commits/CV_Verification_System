export default function SessionWarning({ timeLeft, onExtend, onLogout, lastActivity, graceTimer, onCancelLogout }) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  // Grace period is active
  if (graceTimer !== null && graceTimer !== undefined) {
    return (
      <div className="session-warning-overlay">
        <div className="session-warning-modal grace-period-modal">
          <div className="warning-icon">⏳</div>
          <h2>Logging Out...</h2>
          <p>Logging out in {graceTimer} second{graceTimer !== 1 ? 's' : ''}...</p>
          <button className="btn-primary" onClick={onCancelLogout}>
            Cancel Logout
          </button>
        </div>
      </div>
    );
  }

  const lastActivityTime = lastActivity ? new Date(lastActivity).toLocaleTimeString() : 'Unknown';

  return (
    <div className="session-warning-overlay">
      <div className="session-warning-modal">
        <div className="warning-icon">⚠️</div>
        <h2>Session Expiring Soon</h2>
        <p>Your session will expire due to inactivity in:</p>
        <div className="countdown">
          <span className="time-display">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <p className="warning-description">Click "Continue" to stay logged in or you will be automatically logged out.</p>
        
        <div className="session-info">
          <div className="info-item">
            <span className="info-label">Last Activity:</span>
            <span className="info-value">{lastActivityTime}</span>
          </div>
        </div>

        <div className="warning-actions">
          <button className="btn-primary" onClick={onExtend}>
            Continue Session
          </button>
          <button className="btn-secondary" onClick={onLogout}>
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
}
