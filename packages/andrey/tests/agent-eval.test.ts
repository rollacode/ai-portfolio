// @vitest-environment jsdom
/** WHAT: Synthetic production-path oracle, usage observation and existing handlers.
 * WHY: A wrong agent trace must fail before any valid trace is accepted.
 * ORACLE: tool order/arguments and conservative grounded evidence, not exact prose.
 * These local traces prove grader discrimination, never live model behavior.
 */
import {describe,it,expect,vi,beforeAll,afterAll} from 'vitest';
import {readFileSync,mkdtempSync,mkdirSync,rmSync} from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
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
import {gradeTrace,observeFrame,requestBody,distribution,estimateRoundUsd,type EvalCase,type TraceEvent} from '../scripts/agent-eval-grader';
import {runTurn,sourceProvenance} from '../scripts/eval-agent';
import {getToolsWithContext} from '@ai-portfolio/core/lib/tools';
import {parseArgs,selectPage} from '../scripts/browser-emulation.mjs';

const cases = corpus.cases as EvalCase[];
const contacts = Object.values(config.social);
const tool = (name:string,args:Record<string,unknown>={}):TraceEvent => ({type:'tool_call',name,arguments:args});
const text = (content:string):TraceEvent => ({type:'text',content});
describe('source provenance from the nested site directory',()=>{
  let root:string;
  let site:string;
  let frozen:string;
  const git=(...args:string[])=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  beforeAll(()=>{
      root=mkdtempSync(path.join(tmpdir(),'agent-eval-provenance-'));
      git('init','--initial-branch=main');
      site=path.join(root,'packages/andrey');
      mkdirSync(site,{recursive:true});
      // Import two real commits in one process; keep this isolated regression under
      // Vitest's default deadline without repeated index/commit/signing subprocesses.
      const blob=(mark:number,text:string)=>`blob\nmark :${mark}\ndata ${Buffer.byteLength(text)}\n${text}\n`;
      const commit=(mark:number,blobMark:number,parent?:number)=>`commit refs/heads/main\nmark :${mark}\ncommitter Synthetic Eval <eval@example.invalid> ${mark} +0000\ndata 5\ntest\n${parent?`from :${parent}\n`:''}M 100644 :${blobMark} packages/core/src/agent-loop.ts\n\n`;
      const input=blob(1,'export const baseline = true;\n')+commit(2,1)+blob(3,'export const baseline = false;\n')+commit(4,3,2)+'done\n';
      execFileSync('git',['fast-import','--quiet'],{cwd:root,input,encoding:'utf8'});
      git('reset','--hard','--quiet');
      frozen=git('rev-parse','HEAD^');
  });
  afterAll(()=>{
      if(!root)return;
      // Remove only the directory this test created immediately under the OS temp root.
      if(path.dirname(root)!==path.resolve(tmpdir()) || !path.basename(root).startsWith('agent-eval-provenance-'))throw new Error('unsafe temporary repository cleanup');
      rmSync(root,{recursive:true,force:true});
  });
  it('detects a core change and records actual HEAD rather than the frozen SHA',()=>{
      const changed=sourceProvenance(site,frozen);
      expect(changed.sourceDiffersFromFrozen).toBe(true);
      expect(changed.production_source_sha).toBe(git('rev-parse','HEAD'));
      expect(changed.production_source_sha).not.toBe(frozen);
  });
});
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
  it('includes separately accounted reasoning in cost and refuses unknown canonical pricing',()=>{
    const usage={prompt_tokens:21546,completion_tokens:35,total_tokens:21846,prompt_tokens_details:{cached_tokens:128},completion_tokens_details:{reasoning_tokens:265}};
    expect(estimateRoundUsd(['grok-4.3'],usage)).toBeCloseTo(.0275481,10);
    expect(estimateRoundUsd(['grok-3-mini-fast'],usage)).toBeNull();
    expect(estimateRoundUsd(['grok-4.3'],{...usage,prompt_tokens_details:{}})).toBeNull();
    expect(estimateRoundUsd(['grok-4.3'],{...usage,total_tokens:undefined})).toBeNull();
  });
  it('runs the real loop/parser with local streamed adapter and usage-only frame',async()=>{
    const requests:any[]=[];
    const sse=(frames:any[])=>new Response(frames.map(f=>`data: ${JSON.stringify(f)}\n\n`).join('')+'data: [DONE]\n\n');
    vi.stubGlobal('fetch',vi.fn(async(_url:unknown,init:RequestInit)=>{
      requests.push(JSON.parse(String(init.body)));
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
  it('keeps upstream failures and the six-round bound visible',async()=>{
    const fetcher=vi.fn(async()=>new Response('unavailable',{status:503}));
    vi.stubGlobal('fetch',fetcher);
    try {
      const failed=await runTurn(cases[0],1,[],'Synthetic');
      expect(failed.errors).toContain('upstream HTTP 503');expect(failed.grade.pass).toBe(false);
      fetcher.mockImplementation(async()=>new Response('data: {"choices":[{"delta":{"tool_calls":[{"index":0,"id":"s","function":{"name":"show_project","arguments":"{\\"slug\\":\\"rekap\\"}"}}]},"finish_reason":"tool_calls"}]}\n\ndata: [DONE]\n\n'));
      const bounded=await runTurn(cases.find(c=>c.id==='rekap')!,1,getToolsWithContext(['rekap'],[],[]),'Synthetic');
      expect(bounded.rounds).toHaveLength(6);expect(bounded.errors).toContain('round limit reached');expect(bounded.grade.pass).toBe(false);
    } finally {vi.unstubAllGlobals();}
  });
  it('aborts a hung turn at 60 seconds with no retry',async()=>{
    vi.useFakeTimers();
    const fetcher=vi.fn(async(_url:unknown,init:RequestInit)=>new Promise<Response>((_resolve,reject)=>init.signal!.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})));
    vi.stubGlobal('fetch',fetcher);
    try {
      const pending=runTurn(cases[0],1,[],'Synthetic');
      await vi.advanceTimersByTimeAsync(60000);
      const result=await pending;
      expect(result.errors).toContain('deadline');expect(fetcher).toHaveBeenCalledTimes(1);expect(result.grade.pass).toBe(false);
    } finally {vi.useRealTimers();vi.unstubAllGlobals();}
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
describe('bounded emulation helper',()=>{
  const args=['--endpoint','ws://127.0.0.1:1234/devtools/browser/test','--url','http://localhost:3000','--width','390','--height','844','--mobile','true','--scheme','dark','--motion','reduce'];
  it('refuses wrong settings and remote endpoints before accepting the exact recipe',()=>{
    expect(()=>parseArgs([...args.slice(0,-1),'forever'])).toThrow();
    expect(()=>parseArgs(args.map(s=>s.replace('127.0.0.1','remote.example')))).toThrow();
    expect(parseArgs(args)).toMatchObject({width:390,height:844,mobile:true,scheme:'dark',motion:'reduce'});
  });
  it('refuses missing or ambiguous pages before selecting one exact normalized URL',()=>{
    const page={type:'page',url:'http://localhost:3000/',targetId:'synthetic'};
    expect(()=>selectPage([],'http://localhost:3000')).toThrow();
    expect(()=>selectPage([page,page],'http://localhost:3000')).toThrow();
    expect(selectPage([page],'http://localhost:3000')).toBe(page);
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
