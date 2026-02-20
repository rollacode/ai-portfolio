// ---------------------------------------------------------------------------
// IndexedDB persistence for chat state
// Database: 'portfolio-agent', Store: 'chat'
// Keys: 'messages', 'panelState'
// ---------------------------------------------------------------------------

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, any> }>;
  isError?: boolean;
}

interface StoredPanelState {
  open: boolean;
  type: string | null;
  slug?: string;
  slug2?: string;
  category?: string;
}

// ---------------------------------------------------------------------------
// Consent check
// ---------------------------------------------------------------------------

function hasStorageConsent(): boolean {
  try {
    return localStorage.getItem('storage-consent') !== 'declined';
  } catch {
    // localStorage unavailable (SSR, tests, etc.) — allow writes
    return true;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('portfolio-agent', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('chat')) {
        db.createObjectStore('chat');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putValue(key: string, value: unknown): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  if (!hasStorageConsent()) return;
  try {
    const db = await openDB();
    const tx = db.transaction('chat', 'readwrite');
    tx.objectStore('chat').put(value, key);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`[chat-store] put "${key}" failed:`, err);
  }
}

async function getValue<T>(key: string, fallback: T): Promise<T> {
  if (typeof indexedDB === 'undefined') return fallback;
  try {
    const db = await openDB();
    const tx = db.transaction('chat', 'readonly');
    const request = tx.objectStore('chat').get(key);
    return await new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? fallback);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error(`[chat-store] get "${key}" failed:`, err);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function saveMessages(messages: StoredMessage[]): Promise<void> {
  return putValue('messages', messages);
}

export async function loadMessages(): Promise<StoredMessage[]> {
  return getValue<StoredMessage[]>('messages', []);
}

export async function savePanelState(state: StoredPanelState): Promise<void> {
  return putValue('panelState', state);
}

export async function loadPanelState(): Promise<StoredPanelState | null> {
  return getValue<StoredPanelState | null>('panelState', null);
}

export async function clearAll(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await openDB();
    const tx = db.transaction('chat', 'readwrite');
    const store = tx.objectStore('chat');
    store.delete('messages');
    store.delete('panelState');
    store.delete('insights');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[chat-store] clearAll failed:', err);
  }
}

// ---------------------------------------------------------------------------
// Insight cache
// ---------------------------------------------------------------------------

export interface CachedInsight {
  fullText?: string;
  timestamp: number;
  // Legacy parsed fields (optional, kept for backward compat)
  headline?: string | null;
  metrics?: { years: number; projects: number; level: string } | null;
  narrative?: string;
  projects?: { slug: string; name: string; relevance: string }[] | null;
  quotes?: { author: string; text: string }[] | null;
  connections?: string[] | null;
}

export async function saveInsight(key: string, data: CachedInsight): Promise<void> {
  const all = await getValue<Record<string, CachedInsight>>('insights', {});
  all[key] = data;
  return putValue('insights', all);
}

export async function loadInsight(key: string): Promise<CachedInsight | null> {
  const all = await getValue<Record<string, CachedInsight>>('insights', {});
  const cached = all[key];
  if (!cached) return null;
  // Expire after 1 hour
  if (Date.now() - cached.timestamp > 3600_000) {
    delete all[key];
    await putValue('insights', all);
    return null;
  }
  return cached;
}

// Keep old name working
export const clearMessages = clearAll;
