import { describe, it, expect } from 'vitest';
import { getToolsWithContext } from '../lib/tools';

// xAI (grok) rejects '/' in enum string values: "[engine_imposed] '/' in 'enum'
// string value is currently not supported". Company/skill labels contain slashes
// ("AI/LLM Consulting", "Swift / iOS"), so they must NOT be injected as enums.
describe('getToolsWithContext enum safety', () => {
  const tools = getToolsWithContext(
    ['trax-retail', 'scan-mania'],
    ['AI/LLM Consulting', 'REKAP'],
    ['Swift / iOS', 'CI/CD', 'LLM Agents'],
    ['Daniel Stolero'],
  );

  it('emits no enum value containing a slash', () => {
    for (const t of tools) {
      for (const [param, schema] of Object.entries(t.function.parameters.properties)) {
        for (const v of schema.enum ?? []) {
          expect(v, `${t.function.name}.${param} enum has '/': ${v}`).not.toContain('/');
        }
      }
    }
  });

  it('still lists company and skill values in the description', () => {
    const scroll = tools.find((t) => t.function.name === 'scroll_timeline_to')!;
    expect(scroll.function.description).toContain('AI/LLM Consulting');
    const skill = tools.find((t) => t.function.name === 'highlight_skill')!;
    expect(skill.function.description).toContain('Swift / iOS');
  });

  it('keeps enum for url-safe project slugs', () => {
    const show = tools.find((t) => t.function.name === 'show_project')!;
    expect(show.function.parameters.properties.slug.enum).toEqual(['trax-retail', 'scan-mania']);
  });
});
