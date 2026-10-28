export type ConversationErrorCode = 'offline' | 'network' | 'upstream' | 'quota' | 'rate_limit' | 'aborted' | 'jev_unavailable' | 'timeout' | 'interrupted' | 'unavailable' | 'empty';
export interface ConversationError { code: ConversationErrorCode; title: string; detail: string; retryable: boolean }
export const conversationErrors: Record<ConversationErrorCode, ConversationError> = {
  network: { code: 'network', title: 'Connection failed', detail: 'Check your connection and try again.', retryable: true },
  upstream: { code: 'upstream', title: 'Chat provider is unavailable', detail: 'Please try again shortly.', retryable: true },
  rate_limit: { code: 'rate_limit', title: 'Too many requests', detail: 'Wait a moment and try again.', retryable: true },
  aborted: { code: 'aborted', title: 'Response stopped', detail: 'You can send another message.', retryable: true },
  jev_unavailable: { code: 'jev_unavailable', title: 'Additional context is unavailable', detail: 'Chat can continue.', retryable: false },
  offline: { code: 'offline', title: 'You appear to be offline', detail: 'Check your connection and try again.', retryable: true },
  quota: { code: 'quota', title: 'Daily message limit reached', detail: 'Come back tomorrow or use the contact details.', retryable: false },
  timeout: { code: 'timeout', title: 'The response took too long', detail: 'Please try again.', retryable: true },
  interrupted: { code: 'interrupted', title: 'Response interrupted', detail: 'Please try again.', retryable: true },
  unavailable: { code: 'unavailable', title: 'Chat is temporarily unavailable', detail: 'Please try again shortly.', retryable: true },
  empty: { code: 'empty', title: 'No response arrived', detail: 'Please try again.', retryable: true },
};
export const getConversationError = (code: ConversationErrorCode): ConversationError => ({ ...conversationErrors[code] });
export const canRetryConversationError = (error: ConversationError): boolean => error.retryable;
