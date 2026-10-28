import { describe, expect, it } from 'vitest';
import { encodeConversationEvent, parseClassification } from '../../core/src/lib/conversation-events';
import { brandSpring, DURATION_MS, reducedMotionCrossfade } from '../../core/src/lib/motion';
import { conversationErrors } from '../../core/src/lib/conversation-errors';

describe('frozen foundations', () => {
  it('keeps metadata additive and validates advisory hints', () => {
    const classification = { available: true, visitorType: 'peer', intent: 'projects', language: 'en', leadScore: 2 };
    expect(parseClassification(classification)).toEqual(classification);
    expect(parseClassification({ ...classification, leadScore: Infinity })).toBeUndefined();
    expect(parseClassification({ ...classification, leadScore: 5 })).toBeUndefined();
    const frame = encodeConversationEvent({ id: 'e1', type: 'classification', requestId: 'r', classification });
    expect(JSON.parse(frame.slice(6)).choices).toBeUndefined();
    expect(JSON.parse(frame.slice(6)).conversation_event.requestId).toBe('r');
  });
  it('publishes the approved motion and human-safe errors', () => {
    expect(brandSpring).toEqual({ type: 'spring', stiffness: 420, damping: 22, mass: 1 });
    expect(DURATION_MS.settle).toBe(380);
    expect(reducedMotionCrossfade.duration).toBeLessThanOrEqual(0.15);
    expect(conversationErrors.interrupted.retryable).toBe(true);
  });
});
