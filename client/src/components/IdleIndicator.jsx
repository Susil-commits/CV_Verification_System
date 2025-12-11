export default function IdleIndicator({ isIdle }) {
  if (!isIdle) return null;

  return (
    <div className="idle-indicator">
      <span className="idle-dot"></span>
      <span className="idle-text">You appear to be idle</span>
    </div>
  );
}
