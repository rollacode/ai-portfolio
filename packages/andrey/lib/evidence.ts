import projects from '@/portfolio/projects.json';
import skills from '@/portfolio/skills.json';
import type { Evidence } from '@ai-portfolio/core/lib/evidence/receipts';
export function canonicalEvidence(): Evidence[] {
  return [ ...projects.map(p => ({ id: p.slug, project: p.slug, name: p.name, terms:p.stack, summary:p.description, text: [p.name, p.role, p.period, p.description, ...p.highlights, p.stack.join(', '), p.writeup || ''].join('\n') })),
    { id: 'skills', name: 'Portfolio skills', terms:Object.values(skills).flat().map(skill=>skill.name), summary:'Listed skills; choose this only when no project is relevant.', text: JSON.stringify(skills) } ];
}
