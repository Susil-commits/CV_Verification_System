export default function SessionTimer({ inactiveFor, inactivityTimeout = 20 * 60 * 1000 }) {
  const timeoutSeconds = inactivityTimeout / 1000;
  const timeRemaining = Math.max(0, timeoutSeconds - inactiveFor);
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);

  return (
    <div className="session-timer">
      <span className="timer-label">Time until logout:</span>
      <span className={`timer-display ${timeRemaining < 180 ? 'warning' : ''}`}>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </span>
    </div>
  );
}
