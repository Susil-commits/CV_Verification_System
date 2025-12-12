// Minimal pub/sub manager for rate-limit events to integrate with React context
const listeners = new Set();

export function emitRateLimit(detail) {
  for (const fn of listeners) {
    try {
      fn(detail);
    } catch (err) {
      // ignore
    }
  }
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
