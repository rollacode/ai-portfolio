// ---------------------------------------------------------------------------
// Shared AI provider configuration
//
// All API routes use the same OpenAI-compatible provider.
// Set AI_API_KEY, AI_BASE_URL, AI_MODEL in .env.
// Fallbacks to XAI_* vars for backward compatibility.
// ---------------------------------------------------------------------------

function env(key: string, fallbackKey: string, defaultValue?: string): string {
  return process.env[key] || process.env[fallbackKey] || defaultValue || '';
}

export const API_KEY = () => env('AI_API_KEY', 'XAI_API_KEY');
export const BASE_URL = () => env('AI_BASE_URL', 'XAI_BASE_URL', 'https://api.x.ai/v1');
export const MODEL = () => env('AI_MODEL', 'XAI_MODEL', 'grok-3-mini-fast');

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

export function sseErrorResponse(message: string, status: number = 500): Response {
  const encoder = new TextEncoder();
  const body = encoder.encode(`data: ${JSON.stringify({ error: message })}\n\ndata: [DONE]\n\n`);
  return new Response(body, { status, headers: SSE_HEADERS });
}
