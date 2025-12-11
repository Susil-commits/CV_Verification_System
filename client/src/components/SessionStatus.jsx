export default function SessionStatus({ timeLeft, showWarning }) {
  if (!showWarning || !timeLeft) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="session-status-bar">
      <span className="session-indicator"></span>
      <span className="session-text">
        Session expires in {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
