export default function ActivityHints() {
  const hints = [
    { icon: '🖱️', text: 'Mouse movement' },
    { icon: '⌨️', text: 'Keyboard input' },
    { icon: '👆', text: 'Clicking' },
    { icon: '📜', text: 'Scrolling' },
    { icon: '👈', text: 'Touch events' }
  ];

  return (
    <div className="activity-hints">
      <p className="hints-title">Activity detected from:</p>
      <div className="hints-grid">
        {hints.map((hint) => (
          <div key={hint.text} className="hint-item">
            <span className="hint-icon">{hint.icon}</span>
            <span className="hint-text">{hint.text}</span>
          </div>
        ))}
      </div>
      <p className="hints-note">Any of these activities will keep your session active.</p>
    </div>
  );
}
