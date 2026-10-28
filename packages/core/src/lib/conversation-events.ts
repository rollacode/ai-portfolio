import type { ConversationError } from './conversation-errors';

export interface PanelIdentity { type: string | null; slug?: string; generation: number }
export interface PendingTool { id: string; name: string; panelType: string; generation: number }
export interface Classification { visitorType: string; intent: string; language: string; leadScore?: number; leadConfidence?: number; injection?: boolean; available: boolean }
export interface ConversationRequestFields {
  requestId?: string;
  priorSessionHint?: Classification;
  enableJev?: false;
  capabilities?: { calibrated?: boolean; deferMatchCommentary?: boolean };
}
export interface ClaimReceipt { requestId: string; claimId: string; start: number; end: number; source: string; score?: number; confidence?: number; available: boolean; calibrationVersion?: string }
export interface ServerTiming {
  requestId: string; requestedModel: string; returnedModel?: string; effort?: string;
  firstNameMs?: number; completeToolMs?: number; firstTextMs?: number;
  rounds: number; cachedTokens: number | 'unknown'; durationMs: number; error?: ConversationError['code'];
}
export type ConversationEvent = (
  | { type: 'classification'; requestId: string; classification: Classification }
  | { type: 'tool_start'; requestId: string; toolCallId: string; name: string }
  | ({ type: 'claim_receipt' } & ClaimReceipt)
  | { type: 'correction'; requestId: string; text: string; claimId?: string }
  | { type: 'error'; requestId: string; error: ConversationError; message: string }
  | { type: 'usage'; requestId: string; promptTokens?: number; completionTokens?: number; cachedTokens?: number }
  | { type: 'timing'; requestId: string; timing: ServerTiming }
  | { type: 'context'; requestId: string; enabled: boolean }) & { id: string };

export function encodeConversationEvent(event: ConversationEvent): string {
  // Additive data records are ignored by legacy OpenAI-compatible parsers.
  return `data: ${JSON.stringify({ conversation_event: event })}\n\n`;
}

/** Revalidate advisory client hints. They never confer authority. */
export function parseClassification(value: unknown): Classification | undefined {
  if (!value || typeof value !== 'object') return;
  const v = value as Record<string, unknown>;
  if (typeof v.available !== 'boolean') return;
  for (const key of ['visitorType', 'intent', 'language']) {
    if (typeof v[key] !== 'string' || (v[key] as string).length > 80) return;
  }
  if (v.leadScore !== undefined && (typeof v.leadScore !== 'number' || !Number.isFinite(v.leadScore) || v.leadScore < 0 || v.leadScore > 4)) return;
  if (v.injection !== undefined && typeof v.injection !== 'boolean') return;
  if (v.leadConfidence !== undefined && (typeof v.leadConfidence !== 'number' || !Number.isFinite(v.leadConfidence) || v.leadConfidence < 0 || v.leadConfidence > 1)) return;
  return { available: v.available, visitorType: v.visitorType as string, intent: v.intent as string, language: v.language as string,
    ...(v.leadScore !== undefined ? { leadScore: v.leadScore as number } : {}), ...(v.leadConfidence !== undefined ? { leadConfidence: v.leadConfidence as number } : {}), ...(v.injection !== undefined ? { injection: v.injection as boolean } : {}) };
}
