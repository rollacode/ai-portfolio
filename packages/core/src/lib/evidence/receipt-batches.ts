import type { Receipt } from './receipts';
interface Batch { content:string; receipts:Receipt[] }
const batches=new Map<string,Batch>();
const listeners=new Set<()=>void>();
export const subscribeReceiptBatches=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
export const getReceiptBatch=(requestId?:string)=>requestId?batches.get(requestId):undefined;
export function requestReceiptBatch(requestId:string,content:string){
  if(batches.has(requestId))return;
  const initial:Batch={content,receipts:[]};
  batches.set(requestId,initial);
  if(batches.size>100)batches.delete(batches.keys().next().value!);
  const controller=new AbortController();
  const deadline=setTimeout(()=>controller.abort(),3000);
  fetch('/api/receipts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,content}),signal:controller.signal})
    .then(response=>response.ok?response.json():null).then(result=>{
      if(controller.signal.aborted||batches.get(requestId)!==initial||!result?.available||result.requestId!==requestId||result.content!==content||!Array.isArray(result.receipts))return;
      batches.set(requestId,{content,receipts:result.receipts.filter((receipt:unknown)=>!!receipt&&typeof receipt==='object')});
      listeners.forEach(listener=>listener());
    }).catch(()=>{}).finally(()=>clearTimeout(deadline));
}
