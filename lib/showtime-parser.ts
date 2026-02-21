/* ------------------------------------------------------------------ */
/*  Showtime stream parser                                             */
/*  Parses dramatic narrative with stage direction tags                 */
/* ------------------------------------------------------------------ */

export type LightMode = 'on' | 'off' | 'dim' | 'spotlight';
export type TextStyle = 'whisper' | 'normal' | 'dramatic' | 'accent';

export type ShowtimeSegment =
  | { type: 'text'; content: string; style: TextStyle }
  | { type: 'pause'; duration: number }
  | { type: 'lights'; mode: LightMode }
  | { type: 'style'; style: TextStyle };

/**
 * Normalize raw model output — strip BOM, normalize line endings,
 * replace fullwidth Unicode brackets/colons with ASCII equivalents.
 */
function normalize(raw: string): string {
  return raw
    .replace(/\uFEFF/g, '')          // BOM
    .replace(/\r\n?/g, '\n')         // normalize line endings
    .replace(/\uFF3B/g, '[')         // fullwidth left bracket
    .replace(/\uFF3D/g, ']')         // fullwidth right bracket
    .replace(/\uFF1A/g, ':')         // fullwidth colon
    .replace(/\u200B/g, '')          // zero-width space
    .replace(/\u200C/g, '')          // zero-width non-joiner
    .replace(/\u200D/g, '')          // zero-width joiner
    .replace(/\uFEFF/g, '');         // zero-width no-break space
}

/**
 * Try to classify a bracket tag content (the text between [ and ]).
 * Returns a segment or null if unrecognized.
 */
function classifyTag(
  content: string,
  currentStyle: { value: TextStyle },
): ShowtimeSegment | null {
  const c = content.trim().toLowerCase();

  // pause:N
  const pauseMatch = c.match(/^pause\s*:\s*(\d+(?:\.\d+)?)$/);
  if (pauseMatch) {
    return { type: 'pause', duration: parseFloat(pauseMatch[1]) };
  }

  // lights:mode
  const lightsMatch = c.match(/^lights\s*:\s*(on|off|dim|spotlight)$/);
  if (lightsMatch) {
    return { type: 'lights', mode: lightsMatch[1] as LightMode };
  }

  // style:name
  const styleMatch = c.match(/^style\s*:\s*(whisper|normal|dramatic|accent)$/);
  if (styleMatch) {
    currentStyle.value = styleMatch[1] as TextStyle;
    return { type: 'style', style: currentStyle.value };
  }

  return null; // unrecognized
}

/**
 * Parse a completed showtime response into ordered segments.
 *
 * Uses matchAll to locate all [tag] patterns, then interleaves the text
 * between them as text segments. This is more robust than split() with
 * a capture group, which can behave unexpectedly across runtimes.
 */
export function parseShowtimeResponse(raw: string): ShowtimeSegment[] {
  const segments: ShowtimeSegment[] = [];
  const currentStyle = { value: 'normal' as TextStyle };

  const text = normalize(raw);
  const tagRegex = /\[([^\]]+)\]/g;

  let lastIndex = 0;

  for (const match of text.matchAll(tagRegex)) {
    const matchIndex = match.index!;

    // --- Text before this tag ---
    if (matchIndex > lastIndex) {
      pushTextLines(segments, text.slice(lastIndex, matchIndex), currentStyle.value);
    }

    lastIndex = matchIndex + match[0].length;

    // --- Classify the tag ---
    const seg = classifyTag(match[1], currentStyle);
    if (seg) {
      segments.push(seg);
    }
    // Unknown tags are silently dropped
  }

  // --- Remaining text after the last tag ---
  if (lastIndex < text.length) {
    pushTextLines(segments, text.slice(lastIndex), currentStyle.value);
  }

  return segments;
}

/**
 * Split a text chunk by newlines and push non-empty lines as text segments.
 * Also strips any leftover bracket patterns that might have slipped through.
 */
function pushTextLines(
  segments: ShowtimeSegment[],
  raw: string,
  style: TextStyle,
): void {
  for (const line of raw.split('\n')) {
    // Strip any remaining bracket tags (safety net)
    const cleaned = line.replace(/\[[^\]]*\]/g, '').trim();
    if (cleaned) {
      segments.push({ type: 'text', content: cleaned, style });
    }
  }
}
