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
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('[chat-store] clearAll failed:', err);
  }
}

// Keep old name working
export const clearMessages = clearAll;
