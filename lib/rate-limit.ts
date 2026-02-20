// Simple in-memory rate limiter (sliding window)
const requests = new Map<string, number[]>();

export function rateLimit(ip: string, limit: number, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const timestamps = requests.get(ip) ?? [];
  const recent = timestamps.filter(t => now - t < windowMs);

  if (recent.length >= limit) return false;

  recent.push(now);
  requests.set(ip, recent);
  return true;
}

// Periodic cleanup to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, timestamps] of requests) {
    const recent = timestamps.filter(t => now - t < 60_000);
    if (recent.length === 0) requests.delete(ip);
    else requests.set(ip, recent);
  }
}, 60_000).unref?.();

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() ?? 'unknown';
}
