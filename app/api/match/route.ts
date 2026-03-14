import { NextRequest } from 'next/server';
import { loadPortfolioContent } from '@/lib/system-prompt';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import config from '@/portfolio/config.json';

function env(key: string, fallbackKey: string, defaultValue?: string): string {
  return process.env[key] || process.env[fallbackKey] || defaultValue || '';
}

const API_KEY = () => env('AI_API_KEY', 'XAI_API_KEY');
const BASE_URL = () => env('AI_BASE_URL', 'XAI_BASE_URL', 'https://api.x.ai/v1');
const MODEL = () => env('AI_MODEL', 'XAI_MODEL', 'grok-3-mini-fast');

const SSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  Connection: 'keep-alive',
} as const;

function sseErrorResponse(message: string, status: number = 500): Response {
  const encoder = new TextEncoder();
  const body = encoder.encode(`data: ${JSON.stringify({ error: message })}\n\ndata: [DONE]\n\n`);
  return new Response(body, { status, headers: SSE_HEADERS });
}

function buildMatchPrompt(
  role: string,
  company: string,
  description: string,
  portfolioData: string,
  language: string,
): string {
  const firstName = (config as { firstName?: string }).firstName || 'the developer';
  const languageInstruction =
    language === 'ru' ? 'Russian' : language === 'en' ? 'English' : language;

  return `You are a job match analyst for ${firstName}'s portfolio. Analyze the job description and generate a structured match card.

OUTPUT FORMAT:
Write your response using these exact section headers (## followed by the section name in caps). Write naturally within each section.

## HEADER
role: <exact job title>
company: <company name or description>
match: <honest percentage 60-95 based on ACTUAL current skill overlap — do NOT inflate>
boosted: <percentage 90-99 — the realistic match WITH AI-assisted development. ${firstName} uses Claude Code daily, builds AI agents, and automates everything — any gaps in tooling/frameworks are closed in hours, not months>

## SUMMARY
<2-3 sentences about the match. Be enthusiastic but honest. If there are gaps, frame them positively — e.g. "while ${firstName} hasn't used X specifically, his deep experience with Y means picking up X would be seamless.">

## SKILLS
- <skill name> | <years of experience> | <brief note on match quality>

## EXPERIENCE
- <company name> | <role held> | <why this experience is relevant to the job>

## PROJECTS
- <project-slug> | <project name> | <why this project demonstrates relevant capability>

## SOCIAL_PROOF
- <author name> | <their context (role at company)> | <relevant quote from recommendations>

## GAPS
- <gap description — frame positively: explain why it's not a real blocker. Reference: (1) adjacent skills that transfer, (2) the fact that ${firstName} uses Claude Code and AI coding tools daily — he literally builds AI agents for a living, so picking up a new framework/tool is a matter of hours, not months. e.g. "No production Kafka experience, but deep Redis/Celery event-driven background + daily AI-assisted development means spinning up Kafka consumers is a morning's work">

RULES:
- match: be HONEST. If only 70% of skills match directly, say 70%. Don't inflate. Honesty builds trust.
- boosted: this is the REAL match — ${firstName} works with Claude Code (expert level), builds AI agents, and automates his workflow. Any framework/tool gap gets closed extremely fast. boosted should be 90-99%.
- The GAP between match and boosted tells the story: "yes there are gaps, but with AI-native development they disappear fast."
- For GAPS: NEVER just list missing skills. ALWAYS explain why ${firstName} can handle it — reference adjacent skills + AI-assisted development speed.
- SKILLS: Only list skills that genuinely match between the JD and portfolio. Include years.
- SOCIAL_PROOF: Pick 1-3 most relevant quotes from recommendations. Only include if genuinely relevant.
- PROJECTS: Use real project slugs from the portfolio data.
- Write ALL content in ${languageInstruction}. Section headers stay in English.
- Output ONLY the sections above. No extra commentary.

JOB DESCRIPTION:
Role: ${role}
Company: ${company}
${description}

PORTFOLIO DATA:
${portfolioData}`;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!rateLimit(ip, 10)) {
    return sseErrorResponse('Too many requests', 429);
  }

  const apiKey = API_KEY();
  if (!apiKey) {
    return sseErrorResponse('AI API key is not configured', 500);
  }

  let role: string;
  let company: string;
  let description: string;
  let language: string;

  try {
    const body = await request.json();
    role = body.role;
    company = body.company;
    description = body.description;
    language = body.language || 'en';
  } catch {
    return sseErrorResponse('Invalid JSON body', 400);
  }

  if (!role || !description) {
    return sseErrorResponse('role and description are required', 400);
  }

  try {
    const portfolioData = loadPortfolioContent();
    const systemPrompt = buildMatchPrompt(role, company || 'Unknown', description, portfolioData, language);

    const response = await fetch(`${BASE_URL()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL(),
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this job and generate a match card.` },
        ],
        stream: true,
        temperature: 0.4,
      }),
    });

    if (!response.ok || !response.body) {
      const errorBody = await response.text();
      console.error('Match AI API error:', response.status, errorBody);
      return sseErrorResponse(`AI API error: ${response.status}`, response.status);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let sseBuffer = '';

    const stream = new ReadableStream({
      async pull(controller) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            return;
          }

          sseBuffer += decoder.decode(value, { stream: true });
          const lines = sseBuffer.split('\n');
          sseBuffer = lines.pop() ?? '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const payload = trimmed.slice(6);
            if (payload === '[DONE]') continue;

            try {
              const chunk = JSON.parse(payload);
              const delta = chunk.choices?.[0]?.delta?.content;
              if (delta) {
                const escaped = JSON.stringify(delta);
                controller.enqueue(encoder.encode(`data: {"delta":${escaped}}\n\n`));
              }
            } catch { /* skip malformed */ }
          }
        }
      },
      cancel() {
        reader.cancel();
      },
    });

    return new Response(stream, { headers: SSE_HEADERS });
  } catch (error) {
    console.error('Match API error:', error);
    return sseErrorResponse('Failed to generate match', 500);
  }
}
