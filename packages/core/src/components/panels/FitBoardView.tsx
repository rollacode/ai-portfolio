'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { evidenceLevel, type FitBoard, type FitPair } from '../../lib/evidence/fit';
import { brandSpring, liquidSettle, press, hoverSwell } from '../../lib/motion';
import type { PanelState } from '../../lib/tool-handler';

const labels = ['No direct experience yet', 'Adjacent', 'Some experience', 'Strong match', 'Direct experience'];
const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime-500';
type Navigate = (state: Partial<PanelState>) => void;
function strongestPairs(board: FitBoard, id: string) {
  if (!board.available) return [];
  const matches = board.pairs.filter(pair => pair.requirementId === id && evidenceLevel(pair) > 0 && board.evidence.some(source => source.id === pair.sourceId)).sort((a,b) => b.score-a.score);
  const projects = matches.filter(pair => board.evidence.find(source => source.id === pair.sourceId)?.project);
  return (projects.length ? projects : matches).slice(0,2);
}
function FitRow({board, requirementId, onNavigate}: {board:FitBoard;requirementId:string;onNavigate?:Navigate}) {
  const requirement = board.requirements.find(item => item.id === requirementId)!;
  const pairs = strongestPairs(board, requirementId);
  const primary = pairs[0];
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const reduced = useReducedMotion();
  const row = useRef<HTMLDivElement>(null);
  const origin = useRef<HTMLButtonElement>(null);
  const chipRefs = useRef(new Map<string,HTMLButtonElement>());
  const [paths, setPaths] = useState<Record<string,string>>({});
  useLayoutEffect(() => {
    const measure = () => {
      if (!row.current || !origin.current) return;
      const bounds = row.current.getBoundingClientRect();
      const start = origin.current.getBoundingClientRect();
      const next:Record<string,string> = {};
      for (const pair of pairs) {
        const chip = chipRefs.current.get(pair.sourceId)?.getBoundingClientRect();
        if (!chip || bounds.width < 600) continue;
        const x1 = start.right-bounds.left+6, y1 = start.bottom-bounds.top;
        const x2 = chip.left-bounds.left+8, y2 = chip.bottom-bounds.top+3;
        const rail = bounds.height-3;
        next[pair.sourceId] = `M${x1} ${y1} C${x1} ${rail},${x2} ${rail},${x2} ${y2}`;
      }
      setPaths(next);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (row.current) observer.observe(row.current);
    return () => observer.disconnect();
  // Scores and source identities are immutable for a computed board.
  }, [board, requirementId]);
  const title = requirement.text.charAt(0).toUpperCase()+requirement.text.slice(1);
  return <article className="group border-b border-gray-900/[0.08] last:border-0 dark:border-white/[0.08]">
    <div ref={row} className="relative grid min-h-16 items-center gap-x-6 gap-y-3 py-4 md:grid-cols-[minmax(100px,.8fr)_minmax(110px,1fr)_minmax(110px,1fr)]">
      <svg aria-hidden="true" className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible text-lime-600/20 dark:text-lime-400/20 md:block">{Object.entries(paths).map(([key,path])=><motion.path key={key} d={path} fill="none" stroke="currentColor" strokeWidth="0.7" initial={reduced ? false : {pathLength:0}} animate={{pathLength:1}} transition={brandSpring}/>)}</svg>
      <button ref={origin} type="button" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(value=>!value)} className={`relative flex w-fit items-center gap-2 text-left text-sm font-medium ${focus}`}>
        {title}<svg aria-hidden="true" viewBox="0 0 12 12" className={`h-3 w-3 shrink-0 text-gray-400 transition-transform ${expanded?'rotate-180':''}`}><path d="m3 4.5 3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.2"/></svg>
      </button>
      <div className="relative min-w-0">
        <p className="text-xs text-gray-500 dark:text-gray-400">{!board.available?'Comparison unavailable':labels[primary ? evidenceLevel(primary) : 0]}</p>
        {board.available && primary && <div role="meter" aria-label={`${title} evidence strength`} aria-valuemin={0} aria-valuemax={4} aria-valuenow={primary.score} aria-valuetext={labels[evidenceLevel(primary)]} className="mt-2 h-[3px] overflow-hidden rounded-full bg-lime-600/10 dark:bg-lime-400/10">
          <motion.div className="h-full rounded-full bg-lime-600 dark:bg-lime-400" style={{opacity:primary.confidence===undefined?1:.35+primary.confidence*.65}} initial={false} animate={{width:`${primary.score*25}%`}} transition={reduced?{duration:0}:liquidSettle}/>
        </div>}
      </div>
      <div className="relative flex flex-wrap items-center gap-2">{pairs.map(pair=>{
        const source=board.evidence.find(item=>item.id===pair.sourceId)!;
        return source.project && onNavigate ? <motion.button ref={element=>{if(element)chipRefs.current.set(pair.sourceId,element);else chipRefs.current.delete(pair.sourceId);}} key={source.id} type="button" title={`Open ${source.name || source.id}`} onClick={()=>onNavigate({open:true,type:'project',slug:source.project})} whileHover={reduced?undefined:{scale:1.03}} whileTap={reduced?undefined:{scale:.98}} transition={hoverSwell} className={`rounded-[8px_12px_8px_12px] border border-lime-600/10 bg-lime-600/[0.04] px-2.5 py-1 text-xs text-lime-600 dark:border-lime-400/15 dark:bg-lime-400/[0.04] dark:text-lime-400 ${focus}`}>{source.name?.split(' - ')[0] || source.id}<span aria-hidden="true" className="ml-1.5 opacity-50">↗</span></motion.button> : <span key={source.id} className="text-xs text-gray-500 dark:text-gray-400">Listed in skills</span>;
      })}</div>
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-lime-600/40 opacity-0 transition-opacity group-hover:opacity-100 dark:bg-lime-400/40"/>
    </div>
    {expanded && <div id={id} className="space-y-4 pb-5 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
      {!board.available ? <p>The comparison is unavailable. The original job description is preserved below.</p> : !pairs.length ? <p>I couldn’t find direct portfolio evidence for this requirement.</p> : pairs.map(pair=>{
        const source=board.evidence.find(item=>item.id===pair.sourceId)!;
        const tokens=requirement.text.toLowerCase().split(/\W+/).filter(token=>token.length>3);
        const quote=source.text.split('\n').find(line=>tokens.some(token=>line.toLowerCase().includes(token))) || source.text.split('\n').slice(0,4).join('\n');
        return <div key={source.id} className="border-l border-lime-600/20 pl-3"><p className="font-medium text-gray-700 dark:text-gray-300">{source.name || source.id}<span className="ml-3 font-normal text-gray-500">{pair.score.toFixed(2)}/4</span></p><p className="mt-1.5 whitespace-pre-wrap">{quote}</p>{pair.confidence!==undefined&&<p className="mt-2 text-gray-500" title={`Model confidence ${pair.confidence.toFixed(2)}`}>{pair.confidence<.7?'This comparison is less certain.':'This comparison is more certain.'}</p>}</div>;
      })}
    </div>}
  </article>;
}

export default function FitBoardView({ board, loading, error, retry, onNavigate, originalDescription, originalRole, originalCompany }: { originalRole?:string;originalCompany?:string; originalDescription:string;board?:FitBoard;loading:boolean;error:string|null;retry?:()=>void;onNavigate?:Navigate }) {
  const [showDescription,setShowDescription]=useState(false);
  const id=useId();
  const reduced=useReducedMotion();
  const strong=board?.available?board.requirements.filter(requirement=>{const primary=strongestPairs(board,requirement.id)[0];return primary&&evidenceLevel(primary)>=3;}).length:0;
  return <section aria-label="Fit Board" className="space-y-5 text-gray-900 dark:text-gray-100">
    <header><h2 className="text-lg font-semibold tracking-tight">{board?.role || originalRole || 'Your next role'}</h2>{(board?.company || originalCompany)&&<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{board?.company || originalCompany}</p>}</header>
    <p role="status" className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{loading?(board?'Putting the comparison into words':'Reading your role') : error?'The comparison was interrupted. Your job description is still here.':board?.available?`Strong on ${strong} of ${board.requirements.length} requirements`:'I couldn’t compare the evidence this time. You can still explore the work below.'}</p>
    {!loading&&(!board?.available||error)&&<motion.button type="button" onClick={retry} whileHover={reduced?undefined:{scale:1.03}} whileTap={reduced?undefined:{scale:.98}} transition={press} className={`rounded-[14px_18px_14px_18px] bg-gray-900/[0.04] px-4 py-2.5 text-xs font-medium dark:bg-white/[0.05] ${focus}`}>Try again</motion.button>}
    {loading&&!board&&<div aria-hidden="true" className="space-y-7 py-5">{[1,2,3].map(index=><div key={index} className="grid grid-cols-2 gap-6"><div className="h-3 w-3/4 rounded-full bg-gray-900/[0.06] dark:bg-white/[0.06]"/><div className="h-[3px] self-center rounded-full bg-lime-600/10 dark:bg-lime-400/10"/></div>)}</div>}
    {!!board?.requirements.length&&<div>{board.requirements.map(requirement=><FitRow key={requirement.id} board={board} requirementId={requirement.id} onNavigate={onNavigate}/>)}</div>}
    {board&&!board.available&&<div className="flex flex-wrap gap-2">{board.evidence.filter(source=>source.project).map(source=><button key={source.id} type="button" onClick={()=>onNavigate?.({open:true,type:'project',slug:source.project})} className={`rounded-[8px_12px_8px_12px] bg-lime-600/[0.05] px-3 py-1.5 text-xs text-lime-600 dark:bg-lime-400/[0.05] dark:text-lime-400 ${focus}`}>{source.name || source.id}<span aria-hidden="true" className="ml-2">↗</span></button>)}</div>}
    <div className="border-t border-gray-900/[0.08] pt-4 dark:border-white/[0.08]"><button type="button" aria-expanded={showDescription} aria-controls={id} onClick={()=>setShowDescription(value=>!value)} className={`text-xs text-gray-500 dark:text-gray-400 ${focus}`}>{showDescription?'Hide job description':'View full job description'}</button>{showDescription&&<p id={id} className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-600 dark:text-gray-400">{board?.description || originalDescription}</p>}</div>
  </section>;
}
