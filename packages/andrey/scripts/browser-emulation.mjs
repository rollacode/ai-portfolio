/** WHAT: bounded emulation of one existing watched Domios page.
 * WHY: consistent baseline/final viewport, theme and reduced-motion settings.
 * ORACLE: CDP acknowledges commands for exactly one matching page; no browser launch.
 */
import {pathToFileURL} from 'node:url';

export function parseArgs(args) {
  const values={};
  for(let i=0;i<args.length;i++) {
    const key=args[i];
    if(key==='--restore'){if(values.restore)throw new Error('duplicate flag');values.restore=true;continue;}
    if(!['--endpoint','--url','--width','--height','--mobile','--scheme','--motion'].includes(key) || !args[i+1] || key.slice(2) in values)throw new Error('invalid CLI');
    values[key.slice(2)]=args[++i];
  }
  if(!values.endpoint || !values.url)throw new Error('--endpoint and --url required');
  const endpoint=new URL(values.endpoint);
  if(!['http:','https:','ws:','wss:'].includes(endpoint.protocol) || !['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname))throw new Error('existing local Domios endpoint required');
  if(endpoint.username || endpoint.password)throw new Error('credentials in endpoint refused');
  if(values.restore)return values;
  for(const key of ['width','height']) {
    const n=Number(values[key]);if(!Number.isInteger(n)||n<100||n>4096)throw new Error('viewport must be 100..4096');values[key]=n;
  }
  if(!['true','false'].includes(values.mobile) || !['light','dark'].includes(values.scheme) || !['no-preference','reduce'].includes(values.motion))throw new Error('mobile/scheme/motion required');
  values.mobile=values.mobile==='true';return values;
}
export function selectPage(targets,url) {
  const matches=targets.filter(t=>t.type==='page' && new URL(t.url).href===new URL(url).href);
  if(matches.length!==1)throw new Error('expected exactly one current page matching --url');
  return matches[0];
}
export async function emulate(settings) {
  const expires=Date.now()+10000;
  const abort=AbortSignal.timeout(10000);
  let endpoint=settings.endpoint;
  if(/^https?:/.test(endpoint)) {
    const response=await fetch(new URL('/json/version',endpoint),{signal:abort});
    if(!response.ok)throw new Error('CDP discovery failed');
    endpoint=(await response.json()).webSocketDebuggerUrl;
  }
  const parsed=new URL(endpoint);
  if(!['ws:','wss:'].includes(parsed.protocol)||!['localhost','127.0.0.1','[::1]'].includes(parsed.hostname))throw new Error('local CDP WebSocket required');
  const socket=new WebSocket(endpoint);const pending=new Map();let seq=0;
  const fail=()=>{for(const p of pending.values())p.reject(new Error('CDP connection closed'));pending.clear();};
  socket.addEventListener('close',fail);socket.addEventListener('error',fail);
  socket.addEventListener('message',event=>{
    let data;try{data=JSON.parse(String(event.data));}catch{return;}
    const p=pending.get(data.id);if(!p)return;pending.delete(data.id);
    if(data.error)p.reject(new Error('CDP command rejected'));else p.resolve(data.result);
  });
  const deadline=setTimeout(()=>{fail();socket.close();},Math.max(1,expires-Date.now()));
  try {
    await new Promise((resolve,reject)=>{
      if(abort.aborted)return reject(new Error('CDP deadline'));
      socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',()=>reject(new Error('CDP connection failed')),{once:true});
      abort.addEventListener('abort',()=>reject(new Error('CDP deadline')),{once:true});
    });
    const command=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
      const id=++seq;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params,...sessionId?{sessionId}:{}}));
    });
    const target=selectPage((await command('Target.getTargets')).targetInfos,settings.url);
    const {sessionId}=await command('Target.attachToTarget',{targetId:target.targetId,flatten:true});
    try {
      if(settings.restore) {
        await command('Emulation.clearDeviceMetricsOverride',{},sessionId);
        await command('Emulation.setEmulatedMedia',{features:[]},sessionId);
      } else {
        await command('Emulation.setDeviceMetricsOverride',{width:settings.width,height:settings.height,mobile:settings.mobile,deviceScaleFactor:1},sessionId);
        await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-color-scheme',value:settings.scheme},{name:'prefers-reduced-motion',value:settings.motion}]},sessionId);
      }
    } finally {await command('Target.detachFromTarget',{sessionId});}
    console.log(JSON.stringify({url:settings.url,settings:settings.restore?{restore:true}:{width:settings.width,height:settings.height,mobile:settings.mobile,scheme:settings.scheme,motion:settings.motion},pass:true}));
  } finally {clearTimeout(deadline);socket.close();}
}
if(process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url) {
  try {await emulate(parseArgs(process.argv.slice(2)));}
  catch {console.error('Emulation failed: validate local endpoint, exact unique page URL and settings. No browser launched.');process.exitCode=1;}
}
