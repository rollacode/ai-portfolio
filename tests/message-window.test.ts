import { describe, it, expect } from 'vitest';
import { trimMessages } from '../lib/message-window';

// ---------------------------------------------------------------------------
// Tests — trimMessages
// ---------------------------------------------------------------------------

describe('trimMessages', () => {
  it('returns messages unchanged when under the limit', () => {
    const messages = [
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
    ];
    const result = trimMessages(messages);
    expect(result).toBe(messages); // same reference, not a copy
  });

  it('trims to the most recent 40 messages', () => {
    const messages = Array.from({ length: 50 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `message ${i}`,
    }));
    const result = trimMessages(messages);
    expect(result).toHaveLength(40);
    expect(result[0].content).toBe('message 10'); // sliced from -40
    expect(result[39].content).toBe('message 49');
  });

  it('preserves leading system message when trimming', () => {
    const messages = [
      { role: 'system', content: 'system prompt' },
      ...Array.from({ length: 50 }, (_, i) => ({
        role: 'user',
        content: `msg ${i}`,
      })),
    ];
    const result = trimMessages(messages);
    // system + 40 recent = 41
    expect(result).toHaveLength(41);
    expect(result[0].role).toBe('system');
    expect(result[0].content).toBe('system prompt');
    expect(result[1].content).toBe('msg 10'); // 51 total - 40 = starts at index 11 (msg 10)
  });

  it('does not duplicate system message if it is within the window', () => {
    // Exactly 40 messages with system first — should be returned as-is
    const messages = [
      { role: 'system', content: 'sys' },
      ...Array.from({ length: 39 }, (_, i) => ({
        role: 'user',
        content: `msg ${i}`,
      })),
    ];
    expect(messages).toHaveLength(40);
    const result = trimMessages(messages);
    expect(result).toBe(messages); // same reference
  });

  it('handles empty array', () => {
    const result = trimMessages([]);
    expect(result).toEqual([]);
  });

  it('handles messages with null content', () => {
    const messages = [
      { role: 'assistant', content: null },
      { role: 'user', content: 'hi' },
    ];
    const result = trimMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0].content).toBeNull();
  });

  it('does not add system prefix when first message is not system role', () => {
    const messages = Array.from({ length: 45 }, (_, i) => ({
      role: 'user',
      content: `msg ${i}`,
    }));
    const result = trimMessages(messages);
    expect(result).toHaveLength(40);
    // First message should be msg 5 (45 - 40)
    expect(result[0].content).toBe('msg 5');
    expect(result[0].role).toBe('user');
  });
});
