'use client';
import { motion, useReducedMotion } from 'framer-motion';
import { useConversationContext } from '../../context/ConversationContext';
import { usePortfolioData } from '../../context/PortfolioDataContext';
import { suppressReopenedFitCommentary } from '../../lib/evidence/fit-narration';
import { hoverSwell } from '../../lib/motion';
import type { PanelState } from '../../lib/tool-handler';
interface ToolCallBadgeProps { toolCalls: Array<{name:string;arguments:Record<string,unknown>}>; onNavigate?: (state:Partial<PanelState>)=>void }
interface Decoration { label:string;destination?:Partial<PanelState> }
export function toolDecoration(name:string,args:Record<string,unknown>,projects:Array<{slug:string;name:string}>,spotlight?:string):Decoration|null {
 const project=projects.find(item=>item.slug===args.slug);
 const title=project?.name.split(' - ')[0];
 const panel=(label:string,type:PanelState['type'],extra:Partial<PanelState>={}):Decoration=>({label,destination:{open:true,type,...extra}});
 switch(name){
  case 'show_project': case 'highlight_project_detail': return project?panel(`Opened ${title}`,'project',{slug:project.slug}):null;
  case 'show_gallery': case 'focus_screenshot': return project?panel(`Opened ${title} gallery`,'gallery',{slug:project.slug}):null;
  case 'show_projects': return panel(typeof args.filter==='string'&&/^[a-z -]{1,30}$/.test(args.filter)&&args.filter!=='all'?`Showed projects: ${args.filter}`:'Opened projects','projects',{filter:typeof args.filter==='string'?args.filter:undefined});
  case 'show_skills': case 'highlight_skill': return panel('Explored skills','skills');
  case 'show_contact': return panel('Opened contact','contact');
  case 'show_timeline': case 'scroll_timeline_to': case 'highlight_period': return panel('Explored work history','timeline');
  case 'show_resume': return panel('Opened résumé','resume');
  case 'show_tech_radar': case 'focus_radar_section': return panel('Explored technologies','tech-radar');
  case 'show_quick_facts': return panel('Opened a quick introduction','quick-facts');
  case 'show_spotlight': return panel(`Opened ${spotlight?.split(' - ')[0] || 'overview'}`,'spotlight');
  case 'show_recommendations': case 'highlight_recommendation': return panel('Opened recommendations','recommendations');
  case 'show_insight': return panel('Opened a closer look','insight',{insightTopic:typeof args.topic==='string'?args.topic:undefined,insightIntent:typeof args.intent==='string'?args.intent:undefined});
  case 'scroll_to_project': case 'highlight_project': return project?panel(`Found ${title}`,'projects',{slug:project.slug}):null;
  case 'compare_projects': { const first=projects.find(p=>p.slug===args.slug1),second=projects.find(p=>p.slug===args.slug2);return first&&second?panel('Compared projects','comparison',{slug:first.slug,slug2:second.slug}):null; }
  case 'play_game': return typeof args.game==='string'&&['snake','2048'].includes(args.game)?panel(`Opened ${args.game==='snake'?'Snake':'2048'}`,'game',{game:args.game}):null;
  case 'match_job': return typeof args.description==='string'&&typeof args.role==='string'?panel('Compared your role','job-match',{jobRole:args.role,jobCompany:typeof args.company==='string'?args.company:'',jobDescription:args.description}):null;
  case 'hide_panel': return {label:'Closed the panel'};
  case 'set_theme': return {label:'Changed the theme'};
  case 'start_showtime': return {label:'Started a presentation'};
  default:return null;
 }
}
export default function ToolCallBadge({toolCalls,onNavigate}:ToolCallBadgeProps){
 const {projects,config}=usePortfolioData();
 const conversation=useConversationContext();
 const reduced=useReducedMotion();
 const decorations=toolCalls.map(call=>toolDecoration(call.name,call.arguments,projects,config.spotlight?.name)).filter((item):item is Decoration=>!!item);
 const unique=decorations.filter((item,index)=>decorations.findIndex(other=>other.label===item.label)===index);
 if(!unique.length)return null;
 return <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-gray-400">{unique.map(item=>{
  const contents=<><svg aria-hidden="true" viewBox="0 0 14 14" className="h-3 w-3 opacity-60"><rect x="2" y="2" width="10" height="10" rx="2.5" fill="none" stroke="currentColor"/><path d="M5 9 9 5M5 5h4v4" fill="none" stroke="currentColor"/></svg>{item.label}</>;
  return item.destination&&onNavigate?<motion.button key={item.label} type="button" title={`Reopen: ${item.label.replace(/^(Opened|Explored|Compared|Found|Showed) /,'')}`} onClick={()=>{if(item.destination?.type==='job-match'&&item.destination.jobDescription)suppressReopenedFitCommentary(item.destination.jobDescription,conversation.activeRequestId);onNavigate(item.destination!);}} whileHover={reduced?undefined:{y:-1}} whileTap={reduced?undefined:{scale:.98}} transition={reduced?{duration:0}:hoverSwell} className="tool-chip group/chip inline-flex min-h-7 items-center gap-1.5 rounded-full border border-gray-900/[0.08] bg-white/50 px-2.5 transition-colors hover:border-lime-500/40 hover:text-lime-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:hover:text-lime-300">{contents}<svg aria-hidden="true" viewBox="0 0 12 12" className="-ml-0.5 h-2.5 w-0 opacity-0 transition-all duration-300 group-hover/chip:w-2.5 group-hover/chip:opacity-100"><path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg></motion.button>:<span key={item.label} className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-gray-900/[0.06] px-2.5 dark:border-white/[0.06]">{contents}</span>;
 })}</div>;
}
