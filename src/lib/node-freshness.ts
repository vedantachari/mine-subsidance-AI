const DEFAULT_LIVE_WINDOW_MS = 10 * 60 * 1000;

export function isNodeLive(lastSeen: string, windowMs = DEFAULT_LIVE_WINDOW_MS) {
  const timestamp = Date.parse(lastSeen);
  return Number.isFinite(timestamp) && Date.now() - timestamp <= windowMs;
}
