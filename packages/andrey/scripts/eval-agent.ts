/** WHAT: Bounded live production-path evaluation; WHY: replay cannot prove model behavior.
 * ORACLE: frozen corpus graded against unedited synthetic streams and parsed calls.
 * No tool handlers, visitor writes, secondary analysis, Jev or production config changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {API_KEY,BASE_URL,MODEL} from '@ai-portfolio/core/lib/ai-config';
import {runAgentLoop} from '@ai-portfolio/core/lib/agent-loop';
import {parseStream} from '@ai-portfolio/core/lib/stream-parser';
import {getToolsWithContext} from '@ai-portfolio/core/lib/tools';
import {buildSystemPrompt} from '../lib/system-prompt';
import {gradeTrace,observeFrame,requestBody,distribution,estimateRoundUsd,type EvalCase,type TraceEvent} from './agent-eval-grader';

const base = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const git = (...args:string[]) => execFileSync('git',args,{cwd:base,encoding:'utf8'}).trim();
const hash = (s: string | Buffer) => createHash('sha256').update(s).digest('hex');
const read = (name:string) => JSON.parse(fs.readFileSync(path.join(base,'portfolio',`${name}.json`),'utf8'));
// Git autocrlf changes checkout bytes; freeze UTF-8 with LF exactly as committed.
const fixture = fs.readFileSync(path.join(base,'tests/fixtures/agent-eval.json'),'utf8').replace(/\r\n/g,'\n');
const corpus = JSON.parse(fixture.toString());
const expectedHash = '12ed489da80afb998549e3d45119ec551b5c86491ea70b78270d846a3dab4037';
const metrics = ['firstToolNameMs','firstCompleteValidToolMs','firstTextMs','endMs'] as const;
type Turn = {
  caseId:string; repetition:number; events:TraceEvent[]; rounds:any[]; rawSse:string;
  firstToolNameMs:number|null; firstCompleteValidToolMs:number|null; firstTextMs:number|null; endMs:number;
  errors:string[]; grade:ReturnType<typeof gradeTrace>; cacheState:string; cachedTokens:number|null;
  estimatedUsd:number|null; observedUsd:number|null;
};
function stats(turns:Turn[]) {
  return {
    turns:turns.length,passed:turns.filter(t=>t.grade.pass).length,failed:turns.filter(t=>!t.grade.pass).length,
    errors:turns.filter(t=>t.errors.length).length,
    ...Object.fromEntries(metrics.map(k=>[k,distribution(turns.map(t=>t[k]))])),
    cachedTokens:distribution(turns.map(t=>t.cachedTokens)),
    cacheStates:Object.fromEntries(['cold','warm','unknown'].map(k=>[k,turns.filter(t=>t.cacheState===k).length])),
    estimatedUsd:turns.every(t=>t.estimatedUsd!==null)?turns.reduce((s,t)=>s+t.estimatedUsd!,0):null,
    observedUsd:turns.every(t=>t.observedUsd!==null)?turns.reduce((s,t)=>s+t.observedUsd!,0):null,
  };
}
function schemaValid(event:TraceEvent,tools:ReturnType<typeof getToolsWithContext>):boolean {
  const definition=tools.find(t=>t.function.name===event.name)?.function.parameters;
  if(!definition || !event.arguments || Array.isArray(event.arguments)) return false;
  if((definition.required ?? []).some(k=>event.arguments![k]===undefined)) return false;
  return Object.entries(event.arguments).every(([k,v])=>{
    const rule=definition.properties[k];
    return !!rule && (rule.type==='array'?Array.isArray(v):typeof v===rule.type) && (!rule.enum || rule.enum.includes(v as never));
  });
}

export async function runTurn(c:EvalCase,repetition:number,tools:ReturnType<typeof getToolsWithContext>,prompt:string,effort?:string):Promise<Turn> {
  const started=performance.now();
  const elapsed=()=>Math.round((performance.now()-started)*100)/100;
  const abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),corpus.limits.deadlineMs);
  const originalFetch=globalThis.fetch;
  const events:TraceEvent[]=[];const rounds:any[]=[];const errors:string[]=[];
  let rawSse='';let firstToolNameMs:number|null=null;let firstCompleteValidToolMs:number|null=null;let firstTextMs:number|null=null;
  const endpoint=`${BASE_URL().replace(/\/$/,'')}/chat/completions`;
  // Compatibility seam for unchanged main205199c: real loop still drives every round.
  // The observer forwards original bytes, without executing UI/data tools.
  globalThis.fetch=async(input,init)=>{
    if(String(input)!==endpoint) throw new Error('unexpected eval network destination');
    if(rounds.length>=corpus.limits.maxRounds) throw new Error('six-round bound');
    const request=requestBody(JSON.parse(String(init?.body)),effort);
    const round:any={index:rounds.length+1,requestedModel:request.model,requestedEffort:effort ?? null,returnedModels:[],usage:null,cachedTokens:null,firstToolNameMs:null,firstByteMs:null};
    rounds.push(round);
    let upstream:Response;
    try { upstream=await originalFetch(endpoint,{...init,body:JSON.stringify(request),signal:abort.signal}); }
    catch { errors.push(abort.signal.aborted?'deadline':'upstream transport');throw new Error('eval upstream unavailable'); }
    round.status=upstream.status;
    if(!upstream.ok || !upstream.body) {
      errors.push(`upstream HTTP ${upstream.status}`);
      await upstream.body?.cancel();
      // Do not retain arbitrary provider error bodies (they may echo credentials).
      return new Response('provider request failed',{status:upstream.status || 502});
    }
    const decoder=new TextDecoder();let buffer='';
    const observer=new TransformStream<Uint8Array,Uint8Array>({
      transform(chunk,controller) {
        round.firstByteMs ??= elapsed();
        const decoded=decoder.decode(chunk,{stream:true});rawSse+=decoded;buffer+=decoded;
        const lines=buffer.split('\n');buffer=lines.pop() ?? '';
        for(const line of lines) {
          if(!line.startsWith('data:')) continue;
          const payload=line.slice(5).trim();if(payload==='[DONE]')continue;
          let frame:any;try {frame=JSON.parse(payload);} catch {errors.push('malformed upstream frame');continue;}
          const observed=observeFrame(frame);
          if(observed.model && !round.returnedModels.includes(observed.model))round.returnedModels.push(observed.model);
          if(observed.toolNames.length){firstToolNameMs ??=elapsed();round.firstToolNameMs ??=elapsed();}
          if(observed.usage){round.usage=observed.usage;round.cachedTokens=observed.cachedTokens;}
          if(frame.error) errors.push('upstream stream error');
          if(frame.choices?.[0]?.finish_reason==='length')errors.push('completion truncated');
          round.finishReason=frame.choices?.[0]?.finish_reason ?? round.finishReason;
        }
        controller.enqueue(chunk);
      },
    });
    return new Response(upstream.body.pipeThrough(observer),{status:upstream.status,headers:upstream.headers});
  };
  try {
    const options={baseUrl:BASE_URL().replace(/\/$/,''),apiKey:API_KEY(),model:MODEL(),messages:[{role:'system',content:prompt},...c.history,{role:'user',content:c.input}],tools,maxRounds:6,enableJev:false,includeUsage:true,...effort?{reasoningEffort:effort}:{}};
    const response=await runAgentLoop(options);
    if(!response.ok)errors.push(`loop HTTP ${response.status}`);
    else for await(const e of parseStream(response)) {
      const event={...e,atMs:elapsed()} as TraceEvent;
      if(e.type==='text' && e.content.trim())firstTextMs ??=elapsed();
      if(e.type==='tool_call') {
        if(schemaValid(event,tools)) firstCompleteValidToolMs ??=elapsed();
        else errors.push(`invalid tool schema: ${e.name}`);
      }
      if(e.type==='error')errors.push('parser error');
      events.push(event);
    }
    if(rounds.length===6 && rounds.at(-1).finishReason==='tool_calls')errors.push('round limit reached');
    if(abort.signal.aborted) errors.push('deadline');
  } catch {errors.push(abort.signal.aborted?'deadline':'loop/parser exception');}
  finally {clearTimeout(timer);globalThis.fetch=originalFetch;abort.abort();}
  for(const message of [...new Set(errors)])events.push({type:'error',message,atMs:elapsed()});
  const knownCache=rounds.length>0 && rounds.every(r=>r.cachedTokens!==null);
  const cachedTokens=knownCache?rounds.reduce((s,r)=>s+r.cachedTokens,0):null;
  // Official grok-4.3 rates checked 2026-10-28; other canonical models remain unknown.
  const estimated=rounds.map(r=>estimateRoundUsd(r.returnedModels,r.usage));
  const observed=rounds.map(r=>typeof r.usage?.cost_in_usd_ticks==='number'?r.usage.cost_in_usd_ticks/1e10:null);
  return {caseId:c.id,repetition,events,rounds,rawSse,firstToolNameMs,firstCompleteValidToolMs,firstTextMs,endMs:elapsed(),errors:[...new Set(errors)],grade:gradeTrace(c,events,Object.values(read('config').social)),cachedTokens,cacheState:cachedTokens===null?'unknown':cachedTokens>0?'warm':'cold',estimatedUsd:estimated.length && estimated.every(v=>v!==null)?estimated.reduce<number>((s,v)=>s+v!,0):null,observedUsd:observed.length && observed.every(v=>v!==null)?observed.reduce<number>((s,v)=>s+v!,0):null};
}

async function main() {
  const args=process.argv.slice(2);const values=new Map<string,string>();
  for(let i=0;i<args.length;i+=2){if(!['--out','--baseline','--repetitions'].includes(args[i]) || !args[i+1] || values.has(args[i]))throw new Error('usage: --out PATH [--baseline PATH] --repetitions 2');values.set(args[i],args[i+1]);}
  if(!values.get('--out') || (values.get('--repetitions') ?? '2')!=='2')throw new Error('exactly --repetitions 2 and --out PATH required');
  if(hash(fixture)!==expectedHash || corpus.cases.length!==13)throw new Error('frozen corpus mismatch');
  const out=path.resolve(values.get('--out')!);
  if(fs.existsSync(out))throw new Error('refusing to overwrite immutable report');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const changed=git('diff',corpus.productionSourceSha,'--','packages/core/src','packages/andrey/prompts','packages/andrey/lib','packages/andrey/portfolio');
  const report:any={kind:'live',status:'running',startedAt:new Date().toISOString(),production_source_sha:changed?git('rev-parse','HEAD'):corpus.productionSourceSha,harness_sha:git('rev-parse','HEAD'),sourceDiffersFromFrozen:!!changed,corpusHash:expectedHash,node:process.version,platform:process.platform,requestedModel:MODEL(),requestedEffort:process.env.AI_REASONING_EFFORT || null,providerOrigin:new URL(BASE_URL()).origin,limits:corpus.limits,enableJev:false,adapter:'real-loop/parser; test-only effort+usage fetch observer',tokenCounter:'provider usage.prompt_tokens/completion_tokens; usage.prompt_tokens_details.cached_tokens (unknown if absent); no tokenizer',pricingSource:'https://docs.x.ai/developers/models/grok-4.3',pricingCheckedAt:'2026-10-28',turns:[]};
  const save=()=>fs.writeFileSync(out,JSON.stringify(report,null,2));save();
  if(!API_KEY()){report.status='unavailable';report.error='missing AI_API_KEY / XAI_API_KEY';save();process.exitCode=2;return;}
  let baseline:any;
  if(values.has('--baseline')) {
    baseline=JSON.parse(fs.readFileSync(path.resolve(values.get('--baseline')!),'utf8'));
    if(baseline.kind!=='live' || baseline.corpusHash!==expectedHash || baseline.turns.length!==26)throw new Error('baseline must be complete live report with identical corpus');
  }
  const projects=read('projects'),skills=read('skills'),config=read('config');
  const tools=getToolsWithContext(projects.map((p:any)=>p.slug),read('experience').map((e:any)=>e.company),Object.values(skills).flat().map((s:any)=>s.name),read('recommendations').map((r:any)=>r.name),config.spotlight?.name);
  // Old wrapper uses cwd; explicit base also supports the integrated wrapper contract.
  process.chdir(base);
  const prompt=(buildSystemPrompt as (basePath?:string)=>string)(base);
  report.promptBytes=Buffer.byteLength(prompt);report.promptHash=hash(prompt);
  for(const c of corpus.cases as EvalCase[]) for(let repetition=1;repetition<=2;repetition++) {
    const turn=await runTurn(c,repetition,tools,prompt,process.env.AI_REASONING_EFFORT || undefined);
    report.turns.push(turn);save();
    console.log(`${c.id}/${repetition}: ${turn.grade.pass?'pass':'FAIL'} tools=${turn.grade.toolCount} errors=${turn.errors.length} end_ms=${turn.endMs}`);
  }
  report.summary=stats(report.turns);
  report.perCase=Object.fromEntries((corpus.cases as EvalCase[]).map(c=>[c.id,stats(report.turns.filter((t:Turn)=>t.caseId===c.id))]));
  report.byCache=Object.fromEntries(['cold','warm','unknown'].map(k=>[k,stats(report.turns.filter((t:Turn)=>t.cacheState===k))]));
  if(baseline)report.paired=report.turns.map((t:Turn)=>{const before=baseline.turns.find((b:Turn)=>b.caseId===t.caseId&&b.repetition===t.repetition);return {caseId:t.caseId,repetition:t.repetition,beforeFailures:before.grade.failures,afterFailures:t.grade.failures,beforeCache:before.cacheState,afterCache:t.cacheState,...Object.fromEntries(metrics.map(k=>[`${k}Delta`,before[k]===null||t[k]===null?null:t[k]-before[k]]))};});
  report.status='complete';report.finishedAt=new Date().toISOString();save();
  console.log(JSON.stringify(report.summary));
  if(report.summary.failed)process.exitCode=1;
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Evaluation failed; inspect synthetic report or CLI/configuration prerequisites. No retry performed.');process.exitCode=2;});
