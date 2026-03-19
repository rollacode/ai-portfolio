'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { saveInsight, loadInsight } from '@/lib/chat-store';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MetricsData {
  years: number;
  projects: number;
  level: string;
}

export interface ProjectRef {
  slug: string;
  name: string;
  relevance: string;
}

export interface QuoteData {
  author: string;
  title: string;
  text: string;
}

interface ParsedSection {
  type: string;
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Pure parsers                                                       */
/* ------------------------------------------------------------------ */

function parseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const headerRegex = /^## (HEADLINE|METRICS|NARRATIVE|PROJECTS|QUOTES|CONNECTIONS)\s*$/gm;
  const matches = [...text.matchAll(headerRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const startIdx = match.index! + match[0].length;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    sections.push({ type: match[1].toLowerCase(), content: text.slice(startIdx, endIdx).trim() });
  }

  return sections;
}

/** Shared helper for "- item" list parsing */
function parseListLines(raw: string): string[] {
  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('-'))
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}

function parseMetrics(raw: string): MetricsData | null {
  const y = raw.match(/years:\s*(\d+)/i);
  const p = raw.match(/projects:\s*(\d+)/i);
  const l = raw.match(/level:\s*(expert|professional|familiar)/i);
  return y && p && l ? { years: +y[1], projects: +p[1], level: l[1] } : null;
}

function parseProjects(raw: string): ProjectRef[] {
  return parseListLines(raw)
    .map(line => {
      const [slug = '', name = '', relevance = ''] = line.split('|').map(s => s.trim());
      return { slug, name, relevance };
    })
    .filter(p => p.name);
}

function parseQuotes(raw: string): QuoteData[] {
  return parseListLines(raw)
    .map(line => {
      const pipeIdx = line.indexOf('|');
      if (pipeIdx === -1) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) return null;
        return {
          author: line.slice(0, colonIdx).trim(),
          title: '',
          text: line.slice(colonIdx + 1).trim().replace(/^["\u201C]|["\u201D]$/g, ''),
        };
      }
      const authorPart = line.slice(0, pipeIdx).trim();
      const text = line.slice(pipeIdx + 1).trim().replace(/^["\u201C]|["\u201D]$/g, '');
      const commaIdx = authorPart.indexOf(',');
      return {
        author: commaIdx !== -1 ? authorPart.slice(0, commaIdx).trim() : authorPart,
        title: commaIdx !== -1 ? authorPart.slice(commaIdx + 1).trim() : '',
        text,
      };
    })
    .filter(Boolean) as QuoteData[];
}

function parseConnections(raw: string): string[] {
  return parseListLines(raw);
}

/* ------------------------------------------------------------------ */
/*  Hook interface                                                     */
/* ------------------------------------------------------------------ */

interface UseInsightStreamOptions {
  topic: string;
  intent: string;
  visitorContext?: string;
  language?: string;
}

export interface InsightData {
  headline: string | null;
  metrics: MetricsData | null;
  narrative: string;
  projects: ProjectRef[] | null;
  quotes: QuoteData[] | null;
  connections: string[] | null;
  isLoading: boolean;
  error: string | null;
  /** Which section is currently being streamed */
  streamingSection: string | null;
  /** Whether any parsed content exists */
  hasParsedContent: boolean;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useInsightStream({
  topic,
  intent,
  visitorContext,
  language = 'en',
}: UseInsightStreamOptions): InsightData {
  const [fullText, setFullText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fullTextRef = useRef('');
  const cacheKey = `${topic}::${intent}::${language}`;

  // Derived data
  const sections = useMemo(() => parseSections(fullText), [fullText]);

  // Build a section map for O(1) lookup instead of repeated .find()
  const sectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sections) map[s.type] = s.content;
    return map;
  }, [sections]);

  const lastSectionType = sections.length > 0 ? sections[sections.length - 1].type : null;

  const headline = sectionMap.headline ?? null;
  const metrics = useMemo(
    () => (sectionMap.metrics ? parseMetrics(sectionMap.metrics) : null),
    [sectionMap.metrics],
  );
  const narrative = sectionMap.narrative ?? '';
  const projects = useMemo(
    () => (sectionMap.projects ? parseProjects(sectionMap.projects) : null),
    [sectionMap.projects],
  );
  const quotes = useMemo(
    () => (sectionMap.quotes ? parseQuotes(sectionMap.quotes) : null),
    [sectionMap.quotes],
  );
  const connections = useMemo(
    () => (sectionMap.connections ? parseConnections(sectionMap.connections) : null),
    [sectionMap.connections],
  );

  const streamingSection = isLoading ? lastSectionType : null;
  const hasParsedContent = sections.length > 0;

  // SSE fetch / cache
  useEffect(() => {
    const controller = new AbortController();
    fullTextRef.current = '';
    setFullText('');
    setIsLoading(true);
    setError(null);

    async function fetchInsight() {
      // Try cache first
      const cached = await loadInsight(cacheKey);
      if (cached?.fullText?.includes('## ')) {
        fullTextRef.current = cached.fullText;
        setFullText(cached.fullText);
        setIsLoading(false);
        return;
      }

      // No cache — fetch from API
      const res = await fetch('/api/insight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, intent, visitor_context: visitorContext, language }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop()!;

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);

          if (payload === '[DONE]') {
            setIsLoading(false);
            saveInsight(cacheKey, { fullText: fullTextRef.current, timestamp: Date.now() });
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.delta) {
              fullTextRef.current += parsed.delta;
              setFullText(fullTextRef.current);
            }
          } catch { /* skip malformed JSON chunks */ }
        }
      }

      // Stream ended without [DONE] — still save what we have
      setIsLoading(false);
      saveInsight(cacheKey, { fullText: fullTextRef.current, timestamp: Date.now() });
    }

    fetchInsight().catch((e) => {
      if (e.name === 'AbortError') return;
      setError('Failed to generate insight');
      setIsLoading(false);
    });

    return () => controller.abort();
  }, [topic, intent, visitorContext, language, cacheKey]);

  return {
    headline,
    metrics,
    narrative,
    projects,
    quotes,
    connections,
    isLoading,
    error,
    streamingSection,
    hasParsedContent,
  };
}
