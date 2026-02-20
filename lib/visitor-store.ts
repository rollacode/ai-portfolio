// ---------------------------------------------------------------------------
// Visitor storage abstraction
//
// Uses Upstash Redis when KV_REST_API_URL is set (Vercel production),
// falls back to local filesystem for development.
// ---------------------------------------------------------------------------

import { Redis } from '@upstash/redis';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VisitorEntry {
  visitorId?: string;
  timestamp: string;
  name?: string;
  company?: string;
  role?: string;
  interest?: string;
  email?: string;
  telegram?: string;
  phone?: string;
  linkedin?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Storage backend detection
// ---------------------------------------------------------------------------

const REDIS_KEY = 'portfolio:visitors';

function getRedis(): Redis | null {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// ---------------------------------------------------------------------------
// Redis backend
// ---------------------------------------------------------------------------

async function loadFromRedis(redis: Redis): Promise<VisitorEntry[]> {
  const data = await redis.get<VisitorEntry[]>(REDIS_KEY);
  return data ?? [];
}

async function saveToRedis(redis: Redis, visitors: VisitorEntry[]): Promise<void> {
  await redis.set(REDIS_KEY, visitors);
}

// ---------------------------------------------------------------------------
// Filesystem backend (local dev only)
// ---------------------------------------------------------------------------

async function loadFromFile(): Promise<VisitorEntry[]> {
  // Dynamic import so Node built-ins aren't bundled when using Redis
  const fs = await import('fs');
  const path = await import('path');
  const filePath = path.join(process.cwd(), 'data', 'visitors.json');
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as VisitorEntry[];
    }
  } catch {
    // corrupted file — start fresh
  }
  return [];
}

async function saveToFile(visitors: VisitorEntry[]): Promise<void> {
  const fs = await import('fs');
  const path = await import('path');
  const dirPath = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join(dirPath, 'visitors.json');
  fs.writeFileSync(filePath, JSON.stringify(visitors, null, 2) + '\n', 'utf-8');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function loadVisitors(): Promise<VisitorEntry[]> {
  const redis = getRedis();
  return redis ? loadFromRedis(redis) : loadFromFile();
}

export async function saveVisitors(visitors: VisitorEntry[]): Promise<void> {
  const redis = getRedis();
  return redis ? saveToRedis(redis, visitors) : saveToFile(visitors);
}
