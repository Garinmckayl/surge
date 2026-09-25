type Counter = { used: number; expiresAt: number };
type GuardResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Store = typeof globalThis & { surgeApiCounters?: Map<string, Counter> };
const store = globalThis as Store;
const counters = store.surgeApiCounters ??= new Map<string, Counter>();

function clientAddress(request: Request) {
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

function clearExpired(now: number) {
  if (counters.size < 2_000) return;
  for (const [key, counter] of counters) {
    if (counter.expiresAt <= now) counters.delete(key);
  }
}

export function reservePublicApiBudget(
  request: Request,
  bucket: string,
  units: number,
  maxPerClientWindow: number,
  maxGlobalDaily: number,
  windowMs: number,
): GuardResult {
  const now = Date.now();
  clearExpired(now);
  const address = clientAddress(request);
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const windowEnd = windowStart + windowMs;
  const dailyKey = `${bucket}:global:${new Date(now).toISOString().slice(0, 10)}`;
  const clientKey = `${bucket}:client:${address}:${windowStart}`;
  const daily = counters.get(dailyKey) || { used: 0, expiresAt: Date.parse(`${new Date(now).toISOString().slice(0, 10)}T23:59:59.999Z`) };
  const client = counters.get(clientKey) || { used: 0, expiresAt: windowEnd };

  if (daily.used + units > maxGlobalDaily) {
    const tomorrow = new Date(`${new Date(now).toISOString().slice(0, 10)}T00:00:00.000Z`).getTime() + 86_400_000;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((tomorrow - now) / 1000)) };
  }
  if (client.used + units > maxPerClientWindow) {
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowEnd - now) / 1000)) };
  }

  daily.used += units;
  client.used += units;
  counters.set(dailyKey, daily);
  counters.set(clientKey, client);
  return { allowed: true };
}
