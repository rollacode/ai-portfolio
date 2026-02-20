import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Minimal in-memory IndexedDB fake
// ---------------------------------------------------------------------------

function createFakeIndexedDB() {
  const databases = new Map<string, Map<string, Map<string, unknown>>>();

  function getOrCreateDB(name: string) {
    if (!databases.has(name)) databases.set(name, new Map());
    return databases.get(name)!;
  }

  const fakeIndexedDB = {
    open(name: string, _version?: number) {
      const stores = getOrCreateDB(name);
      const result: any = {};

      const db = {
        objectStoreNames: {
          contains: (n: string) => stores.has(n),
        },
        createObjectStore: (n: string) => {
          stores.set(n, new Map());
        },
        transaction: (storeName: string, mode?: string) => {
          const storeData = stores.get(storeName) ?? new Map();
          if (!stores.has(storeName)) stores.set(storeName, storeData);

          const tx: any = {
            oncomplete: null as (() => void) | null,
            onerror: null as (() => void) | null,
            error: null,
            objectStore: (_name?: string) => ({
              put: (value: unknown, key: string) => {
                storeData.set(key, structuredClone(value));
              },
              get: (key: string) => {
                const req: any = {
                  result: storeData.has(key)
                    ? structuredClone(storeData.get(key))
                    : undefined,
                  onsuccess: null as (() => void) | null,
                  onerror: null as (() => void) | null,
                };
                queueMicrotask(() => req.onsuccess?.());
                return req;
              },
              delete: (key: string) => {
                storeData.delete(key);
              },
            }),
          };

          // Fire oncomplete asynchronously
          queueMicrotask(() => tx.oncomplete?.());
          return tx;
        },
      };

      result.result = db;
      // Fire onupgradeneeded then onsuccess
      result.onupgradeneeded = null;
      result.onsuccess = null;
      result.onerror = null;

      queueMicrotask(() => {
        result.onupgradeneeded?.();
        queueMicrotask(() => result.onsuccess?.());
      });

      return result;
    },
    _clear() {
      databases.clear();
    },
  };

  return fakeIndexedDB;
}

// ---------------------------------------------------------------------------
// Setup: install fake before each test, tear down after
// ---------------------------------------------------------------------------

let fakeIDB: ReturnType<typeof createFakeIndexedDB>;

// We need to re-import the module fresh for each test since it uses
// the global indexedDB at call time (not import time).
let saveMessages: typeof import('../lib/chat-store').saveMessages;
let loadMessages: typeof import('../lib/chat-store').loadMessages;
let savePanelState: typeof import('../lib/chat-store').savePanelState;
let loadPanelState: typeof import('../lib/chat-store').loadPanelState;
let saveInsight: typeof import('../lib/chat-store').saveInsight;
let loadInsight: typeof import('../lib/chat-store').loadInsight;
let clearAll: typeof import('../lib/chat-store').clearAll;
type CachedInsight = import('../lib/chat-store').CachedInsight;

beforeEach(async () => {
  fakeIDB = createFakeIndexedDB();
  (globalThis as any).indexedDB = fakeIDB;

  // Dynamic import with cache busting so each test suite gets a clean module
  const mod = await import('../lib/chat-store');
  saveMessages = mod.saveMessages;
  loadMessages = mod.loadMessages;
  savePanelState = mod.savePanelState;
  loadPanelState = mod.loadPanelState;
  saveInsight = mod.saveInsight;
  loadInsight = mod.loadInsight;
  clearAll = mod.clearAll;
});

afterEach(() => {
  fakeIDB._clear();
  delete (globalThis as any).indexedDB;
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeInsight(overrides: Partial<CachedInsight> = {}): CachedInsight {
  return {
    headline: 'Test Headline',
    metrics: { years: 10, projects: 20, level: 'Senior' },
    narrative: 'A test narrative about the portfolio.',
    projects: [{ slug: 'test-proj', name: 'Test Project', relevance: 'high' }],
    quotes: [{ author: 'Tester', text: 'Great work!' }],
    connections: ['connection-1'],
    timestamp: Date.now(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

describe('Messages', () => {
  it('saveMessages + loadMessages round-trip', async () => {
    const messages = [
      { role: 'user' as const, content: 'Hello' },
      { role: 'assistant' as const, content: 'Hi there!' },
    ];

    await saveMessages(messages);
    const loaded = await loadMessages();

    expect(loaded).toEqual(messages);
  });

  it('loadMessages returns empty array when no data', async () => {
    const loaded = await loadMessages();
    expect(loaded).toEqual([]);
  });

  it('saveMessages overwrites previous data', async () => {
    const first = [{ role: 'user' as const, content: 'First' }];
    const second = [{ role: 'assistant' as const, content: 'Second' }];

    await saveMessages(first);
    await saveMessages(second);
    const loaded = await loadMessages();

    expect(loaded).toEqual(second);
  });

  it('preserves toolCalls and isError fields', async () => {
    const messages = [
      {
        role: 'assistant' as const,
        content: 'Error occurred',
        toolCalls: [{ name: 'open_panel', arguments: { type: 'skills' } }],
        isError: true,
      },
    ];

    await saveMessages(messages);
    const loaded = await loadMessages();

    expect(loaded).toEqual(messages);
    expect(loaded[0].toolCalls).toHaveLength(1);
    expect(loaded[0].isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Panel State
// ---------------------------------------------------------------------------

describe('Panel State', () => {
  it('savePanelState + loadPanelState round-trip', async () => {
    const state = { open: true, type: 'project', slug: 'my-project' };

    await savePanelState(state);
    const loaded = await loadPanelState();

    expect(loaded).toEqual(state);
  });

  it('loadPanelState returns null when no data', async () => {
    const loaded = await loadPanelState();
    expect(loaded).toBeNull();
  });

  it('savePanelState overwrites previous state', async () => {
    const first = { open: true, type: 'skills' };
    const second = { open: false, type: null };

    await savePanelState(first);
    await savePanelState(second);
    const loaded = await loadPanelState();

    expect(loaded).toEqual(second);
  });
});

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

describe('Insights', () => {
  it('saveInsight + loadInsight round-trip', async () => {
    const insight = makeInsight();

    await saveInsight('react', insight);
    const loaded = await loadInsight('react');

    expect(loaded).toEqual(insight);
  });

  it('loadInsight returns null for unknown key', async () => {
    const loaded = await loadInsight('nonexistent-key');
    expect(loaded).toBeNull();
  });

  it('loadInsight returns null for expired entries (timestamp > 1 hour)', async () => {
    const oldInsight = makeInsight({
      timestamp: Date.now() - 3600_001, // 1 hour + 1ms ago
    });

    await saveInsight('stale', oldInsight);
    const loaded = await loadInsight('stale');

    expect(loaded).toBeNull();
  });

  it('loadInsight returns valid entry just under 1 hour', async () => {
    const freshInsight = makeInsight({
      timestamp: Date.now() - 3599_999, // just under 1 hour
    });

    await saveInsight('fresh', freshInsight);
    const loaded = await loadInsight('fresh');

    expect(loaded).toEqual(freshInsight);
  });

  it('multiple insights saved with different keys', async () => {
    const insightA = makeInsight({ headline: 'Insight A' });
    const insightB = makeInsight({ headline: 'Insight B' });

    await saveInsight('key-a', insightA);
    await saveInsight('key-b', insightB);

    const loadedA = await loadInsight('key-a');
    const loadedB = await loadInsight('key-b');

    expect(loadedA).toEqual(insightA);
    expect(loadedB).toEqual(insightB);
  });

  it('saveInsight overwrites same key', async () => {
    const first = makeInsight({ headline: 'First' });
    const second = makeInsight({ headline: 'Second' });

    await saveInsight('overwrite-me', first);
    await saveInsight('overwrite-me', second);

    const loaded = await loadInsight('overwrite-me');
    expect(loaded).toEqual(second);
  });

  it('expired insight is deleted from storage on read', async () => {
    const oldInsight = makeInsight({
      timestamp: Date.now() - 3600_001,
    });
    const freshInsight = makeInsight({ headline: 'Fresh' });

    await saveInsight('stale', oldInsight);
    await saveInsight('fresh', freshInsight);

    // Reading stale should return null and remove it
    const stale = await loadInsight('stale');
    expect(stale).toBeNull();

    // Fresh should still be there
    const fresh = await loadInsight('fresh');
    expect(fresh).toEqual(freshInsight);
  });
});

// ---------------------------------------------------------------------------
// clearAll
// ---------------------------------------------------------------------------

describe('clearAll', () => {
  it('removes messages, panel state, and insights', async () => {
    await saveMessages([{ role: 'user', content: 'Hello' }]);
    await savePanelState({ open: true, type: 'skills' });
    await saveInsight('key', makeInsight());

    await clearAll();

    const messages = await loadMessages();
    const panelState = await loadPanelState();
    const insight = await loadInsight('key');

    expect(messages).toEqual([]);
    expect(panelState).toBeNull();
    expect(insight).toBeNull();
  });

  it('clearAll on empty store does not throw', async () => {
    await expect(clearAll()).resolves.not.toThrow();
  });
});
