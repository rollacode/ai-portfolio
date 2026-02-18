import { NextRequest } from 'next/server';
import { buildSystemPrompt } from '@/lib/system-prompt';
import { getToolsWithContext } from '@/lib/tools';
import projects from '@/data/projects.json';

// ---------------------------------------------------------------------------
// Multi-provider AI support
//
// This route works with ANY OpenAI-compatible chat completions API.
// Just set three env vars: AI_API_KEY, AI_BASE_URL, AI_MODEL.
//
// Supported providers (set AI_BASE_URL and AI_MODEL in .env):
// - xAI/Grok:     AI_BASE_URL=https://api.x.ai/v1              AI_MODEL=grok-3-mini-fast
// - OpenAI:       AI_BASE_URL=https://api.openai.com/v1         AI_MODEL=gpt-4o-mini
// - Groq:         AI_BASE_URL=https://api.groq.com/openai/v1    AI_MODEL=llama-3.1-70b-versatile
// - Together:     AI_BASE_URL=https://api.together.xyz/v1       AI_MODEL=meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo
// - Local/Ollama: AI_BASE_URL=http://localhost:11434/v1          AI_MODEL=llama3.1
//
// All providers use the same Authorization: Bearer header and
// POST /chat/completions endpoint. No provider-specific logic needed.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Env helpers (AI_* with XAI_* fallbacks for backward compat)
// ---------------------------------------------------------------------------

function env(key: string, fallbackKey: string, defaultValue?: string): string {
  return process.env[key] || process.env[fallbackKey] || defaultValue || '';
}

const API_KEY = () => env('AI_API_KEY', 'XAI_API_KEY');
const BASE_URL = () => env('AI_BASE_URL', 'XAI_BASE_URL', 'https://api.x.ai/v1');
const MODEL = () => env('AI_MODEL', 'XAI_MODEL', 'grok-3-mini-fast');

// ---------------------------------------------------------------------------
// Extract context values from data for tool enrichment
// ---------------------------------------------------------------------------

const projectSlugs = projects.map((p) => p.slug);

const companyNames = [
  'REKAP',
  'Performica',
  'QuantumSoft',
  'Trax Retail',
  'Secret Stronghold',
];

const skillNames = [
  'Swift / iOS',
  'React / TypeScript',
  'Python / FastAPI',
  'System Architecture',
  'SwiftUI',
  'Computer Vision / OpenCV',
  'ARKit / SceneKit',
  'Objective-C',
  'Android / Kotlin',
  'LLM Agents',
  'Product Management',
  'Unity3D / C#',
  'Docker / DevOps',
  'PostgreSQL',
];

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const apiKey = API_KEY();

  if (!apiKey) {
    return Response.json(
      { error: 'AI API key is not configured. Set AI_API_KEY (or XAI_API_KEY) env var.' },
      { status: 500 },
    );
  }

  try {
    const { messages } = (await request.json()) as {
      messages: Array<{ role: string; content: string }>;
    };

    const systemPrompt = buildSystemPrompt();
    const tools = getToolsWithContext(projectSlugs, companyNames, skillNames);

    const response = await fetch(`${BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL(),
        messages: [{ role: 'system', content: systemPrompt }, ...messages],
        tools,
        stream: true,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return Response.json(
        { error: `AI API error: ${response.status}`, detail: errorBody },
        { status: response.status },
      );
    }

    // Pipe the raw SSE stream straight through — the client-side parser
    // handles content deltas and tool_calls from the chunked response.
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
