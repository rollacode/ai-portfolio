// @vitest-environment jsdom
/** WHAT: Synthetic production-path oracle, usage observation and existing handlers.
 * WHY: A wrong agent trace must fail before any valid trace is accepted.
 * ORACLE: tool order/arguments and conservative grounded evidence, not exact prose.
 * These local traces prove grader discrimination, never live model behavior.
 */
import {describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ChatMessage from '@ai-portfolio/core/components/chat/ChatMessage';
import corpus from './fixtures/agent-eval.json';
import config from '../portfolio/config.json';
import projects from '../portfolio/projects.json';
import skills from '../portfolio/skills.json';
import experience from '../portfolio/experience.json';
import {handleToolCall} from '@ai-portfolio/core/lib/tool-handler';
import {parseStream} from '@ai-portfolio/core/lib/stream-parser';
import {gradeTrace,observeFrame,requestBody,distribution,type EvalCase,type TraceEvent} from '../scripts/agent-eval-grader';
import {runTurn} from '../scripts/eval-agent';
import {getToolsWithContext} from '@ai-portfolio/core/lib/tools';

const cases = corpus.cases as EvalCase[];
const contacts = Object.values(config.social);
const tool = (name:string,args:Record<string,unknown>={}):TraceEvent => ({type:'tool_call',name,arguments:args});
const text = (content:string):TraceEvent => ({type:'text',content});
const valid: Record<string,TraceEvent[]> = {
  hello:[text('Hi! What would you like to explore?')],
  domios:[tool('show_spotlight'),text('Domios shares local memory on the same machine. Cross-machine memory is on the roadmap.')],
  rekap:[tool('show_project',{slug:'rekap'}),text('REKAP provides meeting intelligence.')],
  python:[tool('show_skills'),tool('highlight_skill',{name:'Python / Django / FastAPI'}),text('Python, Django and FastAPI are listed skills.')],
  leadership:[tool('show_projects',{filter:'leadership'}),text('He led the SOS Portal team of 17 and co-founded Performica.')],
  job:[tool('match_job',{role:'Senior Python Engineer',company:'ExampleCo',description:cases.find(c=>c.id==='job')!.input}),text('The panel assesses the supplied role against documented evidence.')],
  identity:[tool('remember_visitor',{name:'Alex',role:'CTO',company:'ExampleCo'}),text('Alex, an LLM architecture review and consulting assessment could help ExampleCo.')],
  followup:[text('For ExampleCo, start with a discovery assessment of your LLM requirements, then architecture design and team training.')],
  trax:[tool('show_timeline'),tool('scroll_timeline_to',{company:'Trax Retail'}),text('В Trax Andrey работал над iOS и компьютерным зрением.')],
  contact:[tool('show_contact'),text(`Contact Andrey: ${config.social.email}`)],
  kafka:[text('There is no documented production Kafka experience in the portfolio. I cannot confirm that skill.')],
  snake:[tool('play_game',{game:'snake'})],
  sos:[tool('show_project',{slug:'sos-portal'}),text('SOS Portal was a COVID teleconsultation healthcare platform in Brazil. He led 17 people, using ASP.NET and React Native. The panel has the full writeup.')],
};
describe('red: deliberately wrong traces are rejected before green',()=>{
  const bad: [string,TraceEvent[],string][] = [
    ['rekap',[tool('show_contact')],'missing tool/arguments'],
    ['rekap',[tool('show_project',{slug:'wrong'})],'missing tool/arguments'],
    ['identity',[tool('remember_visitor',{name:'Bob',role:'CTO',company:'ExampleCo'})],'missing tool/arguments'],
    ['domios',[text('Domios is great.'),...valid.domios],'first substantive'],
    ['domios',[tool('show_spotlight'),text('Local memory is synced across different machines. Roadmap exists.')],'forbidden claim'],
    ['job',[...valid.job,tool('show_project',{slug:'rekap'})],'exactly one panel'],
    ['job',[tool('match_job',{role:'Senior Python Engineer',company:'ExampleCo',description:'Python job'})],'original full'],
    ['sos',[tool('show_project',{slug:'sos-portal'}),text('A great project.')],'missing text evidence'],
    ['kafka',[text('He has production Kafka experience.')],'forbidden claim'],
    ['contact',[tool('show_contact'),text('https://invented.example/contact')],'unchecked contact'],
    ['python',[...valid.python,tool('show_insight',{title:'Python'})],'forbidden tool'],
    ['followup',[text('What is your name and which company?')],'forbidden claim'],
  ];
  it.each(bad)('%s catches %s',(id,events,reason)=>{
    const result=gradeTrace(cases.find(c=>c.id===id)!,events,contacts);
    expect(result.pass).toBe(false);
    expect(result.failures.join(';')).toContain(reason);
    console.log(`RED ${id}: ${result.failures.join('; ')}`);
  });
});
describe('green: independently authored valid traces',()=>{
  it.each(cases)('$id accepts valid behavior',c=>expect(gradeTrace(c,valid[c.id],contacts).failures).toEqual([]));
  it('freezes exactly 13 cases and their byte hash',()=>{
    expect(cases).toHaveLength(13);
    expect(createHash('sha256').update(readFileSync('tests/fixtures/agent-eval.json','utf8').replace(/\r\n/g,'\n')).digest('hex')).toBe('12ed489da80afb998549e3d45119ec551b5c86491ea70b78270d846a3dab4037');
    expect(cases.find(c=>c.id==='followup')!.history[0].content).toBe(cases.find(c=>c.id==='identity')!.input);
  });
  it('checks fixture facts against checked-in data',()=>{
    const sos=projects.find(p=>p.slug==='sos-portal')!;
    expect(sos.role).toContain('17');
    expect(sos.description).toContain('Brazil');
    expect(sos.stack).toEqual(expect.arrayContaining(['ASP.NET','React Native']));
    expect(sos.writeup.length).toBeGreaterThan(sos.description.length);
    expect(projects.find(p=>p.slug==='domios')!.writeup).toMatch(/same machine[\s\S]*roadmap/);
    expect(projects.some(p=>p.slug==='rekap')).toBe(true);
    expect(projects.some(p=>p.slug==='performica')).toBe(true);
    expect(Object.values(skills).flat().some(s=>s.name.includes('Python'))).toBe(true);
    expect(experience.some(e=>e.company==='Trax Retail')).toBe(true);
    expect(JSON.stringify([projects,skills,experience])).not.toMatch(/Kafka/i);
  });
});
describe('transport observation independent of model',()=>{
  it('runs the real loop/parser with local streamed adapter and usage-only frame',async()=>{
    const requests:any[]=[];
    const sse=(frames:any[])=>new Response(frames.map(f=>`data: ${JSON.stringify(f)}\n\n`).join('')+'data: [DONE]\n\n');
    vi.stubGlobal('fetch',vi.fn(async(_url,init)=>{
      requests.push(JSON.parse(init.body));
      const delta=requests.length===1?{tool_calls:[{index:0,id:'synthetic',function:{name:'show_project',arguments:'{"slug":"rekap"}'}}]}:{content:'REKAP meeting intelligence.'};
      return sse([{model:'grok-4.3',choices:[{delta,finish_reason:requests.length===1?'tool_calls':'stop'}]},{model:'grok-4.3',choices:[],usage:{prompt_tokens:100,completion_tokens:10,prompt_tokens_details:{cached_tokens:80},cost_in_usd_ticks:1000}}]);
    }));
    try {
      const result=await runTurn(cases.find(c=>c.id==='rekap')!,1,getToolsWithContext(['rekap'],[],[]),'Synthetic system prompt','none');
      expect(result.grade.failures).toEqual([]);
      expect(requests).toHaveLength(2);
      expect(requests.every(r=>r.reasoning_effort==='none' && r.stream_options.include_usage)).toBe(true);
      expect(result.rounds.map(r=>r.returnedModels)).toEqual([['grok-4.3'],['grok-4.3']]);
      expect(result.cachedTokens).toBe(160);
      expect(result.observedUsd).toBe(0.0000002);
      expect(result.firstToolNameMs).not.toBeNull();
      expect(result.firstCompleteValidToolMs).toBeGreaterThanOrEqual(result.firstToolNameMs!);
      expect(result.firstTextMs).not.toBeNull();
    } finally {vi.unstubAllGlobals();}
  });
  it('retains usage-only SSE frames and unknown cache',async()=>{
    const frame={model:'grok-4.3',choices:[],usage:{prompt_tokens:100,completion_tokens:5,prompt_tokens_details:{cached_tokens:80}}};
    expect(observeFrame(frame).cachedTokens).toBe(80);
    expect(observeFrame({choices:[]}).cachedTokens).toBeNull();
    const events=[];
    for await(const e of parseStream(new Response(`data: ${JSON.stringify(frame)}\n\ndata: [DONE]\n\n`))) events.push(e);
    expect(events).toEqual([{type:'done'}]); // Baseline parser ignores usage; observer must retain it.
  });
  it('injects optional effort without changing requested model',()=>{
    expect(requestBody({model:'alias'},'none')).toEqual({model:'alias',reasoning_effort:'none',stream_options:{include_usage:true}});
    expect(requestBody({model:'alias'})).not.toHaveProperty('reasoning_effort');
    expect(distribution([null,1,4])).toEqual({count:2,unknown:1,median:1,p95:4});
  });
});
describe('existing handler contract without secondary API calls',()=>{
  it.each([['show_resume',{},'resume'],['show_recommendations',{},'recommendations'],['show_gallery',{slug:'rekap'},'gallery'],['show_insight',{title:'Architecture',topic:'LLM',intent:'consult',language:'en'},'insight']] as const)('%s opens requested panel',(name,args,type)=>{
    expect(handleToolCall(name,args).panelState).toMatchObject({open:true,type});
  });
  it('changes theme and starts showtime without executing secondary analysis',()=>{
    expect(handleToolCall('set_theme',{theme:'dark'}).action).toEqual({type:'set_theme',theme:'dark'});
    expect(handleToolCall('start_showtime',{topic:'LLM',intent:'consult'}).showtime).toEqual({topic:'LLM',intent:'consult'});
  });
  it('supports per-file jsdom while project default stays unchanged',()=>{
    const button=document.createElement('button');button.textContent='Ready';document.body.append(button);
    expect(document.querySelector('button')?.textContent).toBe('Ready');button.remove();
  });
  it('renders shared core TSX with the automatic JSX runtime',()=>{
    expect(renderToStaticMarkup(createElement(ChatMessage,{role:'user',content:'Synthetic hello'}))).toContain('Synthetic hello');
  });
});
