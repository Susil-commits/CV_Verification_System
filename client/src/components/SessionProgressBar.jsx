export default function SessionProgressBar({ progress, isIdle }) {
  return (
    <div className={`session-progress-container ${isIdle ? 'idle' : ''}`}>
      <div className="progress-bar">
        <div
          className={`progress-fill ${progress < 25 ? 'critical' : progress < 50 ? 'warning' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className="progress-text">{Math.round(progress)}% Session Active</span>
    </div>
  );
}
