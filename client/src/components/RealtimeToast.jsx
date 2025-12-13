// No hooks required

export default function RealtimeToast({ toasts, removeToast }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="realtime-toast-wrapper">
      {toasts.map((t) => (
        <div key={t.id} className="realtime-toast">
          <div className="realtime-toast-title">{t.title}</div>
          <div className="realtime-toast-message">{t.message}</div>
          <button className="realtime-toast-close" onClick={() => removeToast(t.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
