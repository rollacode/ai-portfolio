'use client';

import { useEffect, useRef, useState, useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MatchedSkill {
  name: string;
  years?: number;
  note?: string;
}

export interface RelevantExperience {
  company: string;
  role: string;
  relevance: string;
}

export interface RelevantProject {
  slug: string;
  name: string;
  relevance: string;
}

export interface SocialProof {
  author: string;
  context: string;
  quote: string;
}

export interface JobMatchStreamData {
  role: string | null;
  company: string | null;
  matchPercent: number | null;
  boostedPercent: number | null;
  summary: string;
  matchedSkills: MatchedSkill[];
  relevantExperience: RelevantExperience[];
  relevantProjects: RelevantProject[];
  socialProof: SocialProof[];
  gaps: string[];
  isLoading: boolean;
  error: string | null;
  streamingSection: string | null;
  hasParsedContent: boolean;
}

/* ------------------------------------------------------------------ */
/*  Parsers                                                            */
/* ------------------------------------------------------------------ */

interface ParsedSection {
  type: string;
  content: string;
}

function parseSections(text: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const headerRegex = /^## (HEADER|SUMMARY|SKILLS|EXPERIENCE|PROJECTS|SOCIAL_PROOF|GAPS)\s*$/gm;
  const matches = [...text.matchAll(headerRegex)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const startIdx = match.index! + match[0].length;
    const endIdx = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    sections.push({ type: match[1].toLowerCase(), content: text.slice(startIdx, endIdx).trim() });
  }
  return sections;
}

function parseListLines(raw: string): string[] {
  return raw.split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('-'))
    .map(l => l.replace(/^-\s*/, '').trim())
    .filter(Boolean);
}

function parseHeader(raw: string): { role: string; company: string; match: number; boosted: number } | null {
  const r = raw.match(/role:\s*(.+)/i);
  const c = raw.match(/company:\s*(.+)/i);
  const m = raw.match(/match:\s*(\d+)/i);
  const b = raw.match(/boosted:\s*(\d+)/i);
  if (!r) return null;
  const match = m ? Math.min(100, +m[1]) : 70;
  const boosted = b ? Math.max(match, Math.min(99, +b[1])) : Math.min(99, match + 20);
  return {
    role: r[1].trim(),
    company: c?.[1]?.trim() || '',
    match,
    boosted,
  };
}

function parseSkills(raw: string): MatchedSkill[] {
  return parseListLines(raw).map(line => {
    const parts = line.split('|').map(s => s.trim());
    return {
      name: parts[0] || '',
      years: parts[1] ? parseInt(parts[1]) || undefined : undefined,
      note: parts[2] || undefined,
    };
  }).filter(s => s.name);
}

function parseExperience(raw: string): RelevantExperience[] {
  return parseListLines(raw).map(line => {
    const parts = line.split('|').map(s => s.trim());
    return {
      company: parts[0] || '',
      role: parts[1] || '',
      relevance: parts[2] || '',
    };
  }).filter(e => e.company);
}

function parseProjects(raw: string): RelevantProject[] {
  return parseListLines(raw).map(line => {
    const parts = line.split('|').map(s => s.trim());
    return {
      slug: parts[0] || '',
      name: parts[1] || '',
      relevance: parts[2] || '',
    };
  }).filter(p => p.name);
}

function parseSocialProof(raw: string): SocialProof[] {
  return parseListLines(raw).map(line => {
    const parts = line.split('|').map(s => s.trim());
    return {
      author: parts[0] || '',
      context: parts[1] || '',
      quote: (parts[2] || '').replace(/^["\u201C]|["\u201D]$/g, ''),
    };
  }).filter(s => s.author && s.quote);
}

function parseGaps(raw: string): string[] {
  return parseListLines(raw);
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

interface UseJobMatchStreamOptions {
  role: string;
  company: string;
  description: string;
  language?: string;
}

export function useJobMatchStream({
  role,
  company,
  description,
  language = 'en',
}: UseJobMatchStreamOptions): JobMatchStreamData {
  const [fullText, setFullText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fullTextRef = useRef('');

  const sections = useMemo(() => parseSections(fullText), [fullText]);
  const sectionMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of sections) map[s.type] = s.content;
    return map;
  }, [sections]);

  const lastSectionType = sections.length > 0 ? sections[sections.length - 1].type : null;

  const header = useMemo(
    () => (sectionMap.header ? parseHeader(sectionMap.header) : null),
    [sectionMap.header],
  );
  const summary = sectionMap.summary ?? '';
  const matchedSkills = useMemo(
    () => (sectionMap.skills ? parseSkills(sectionMap.skills) : []),
    [sectionMap.skills],
  );
  const relevantExperience = useMemo(
    () => (sectionMap.experience ? parseExperience(sectionMap.experience) : []),
    [sectionMap.experience],
  );
  const relevantProjects = useMemo(
    () => (sectionMap.projects ? parseProjects(sectionMap.projects) : []),
    [sectionMap.projects],
  );
  const socialProof = useMemo(
    () => (sectionMap.social_proof ? parseSocialProof(sectionMap.social_proof) : []),
    [sectionMap.social_proof],
  );
  const gaps = useMemo(
    () => (sectionMap.gaps ? parseGaps(sectionMap.gaps) : []),
    [sectionMap.gaps],
  );

  useEffect(() => {
    const controller = new AbortController();
    fullTextRef.current = '';
    setFullText('');
    setIsLoading(true);
    setError(null);

    async function fetchMatch() {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, company, description, language }),
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
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.delta) {
              fullTextRef.current += parsed.delta;
              setFullText(fullTextRef.current);
            }
          } catch { /* skip */ }
        }
      }

      setIsLoading(false);
    }

    fetchMatch().catch((e) => {
      if (e.name === 'AbortError') return;
      setError('Failed to generate match analysis');
      setIsLoading(false);
    });

    return () => controller.abort();
  }, [role, company, description, language]);

  return {
    role: header?.role || null,
    company: header?.company || null,
    matchPercent: header?.match ?? null,
    boostedPercent: header?.boosted ?? null,
    summary,
    matchedSkills,
    relevantExperience,
    relevantProjects,
    socialProof,
    gaps,
    isLoading,
    error,
    streamingSection: isLoading ? lastSectionType : null,
    hasParsedContent: sections.length > 0,
  };
}
