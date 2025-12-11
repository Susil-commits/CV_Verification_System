export default function ActivityTracker({ lastActivity, inactiveFor, extensionCount }) {
  if (!lastActivity) return null;

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString();
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="activity-tracker">
      <div className="tracker-item">
        <span className="tracker-label">Last Activity</span>
        <span className="tracker-value">{formatTime(lastActivity)}</span>
      </div>
      <div className="tracker-item">
        <span className="tracker-label">Inactive For</span>
        <span className="tracker-value">{formatDuration(inactiveFor)}</span>
      </div>
      {extensionCount > 0 && (
        <div className="tracker-item">
          <span className="tracker-label">Extensions</span>
          <span className="tracker-value">{extensionCount}</span>
        </div>
      )}
    </div>
  );
}
