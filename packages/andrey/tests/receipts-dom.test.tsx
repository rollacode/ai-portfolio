// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {it,expect,vi} from 'vitest';
import ReceiptDot from '../../core/src/components/chat/ReceiptDot';
import ChatMessage from '../../core/src/components/chat/ChatMessage';
import JobMatchPanel from '../../core/src/components/panels/JobMatchPanel';
import {PortfolioDataProvider} from '../../core/src/context/PortfolioDataContext';
import {ConversationProvider} from '../../core/src/context/ConversationContext';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
it('receipt control exposes exact source on focus/tap, keeps it on pointer leave, and dismisses on Escape',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(<ReceiptDot receipt={{id:'claim-0',start:2,end:7,text:'Swift',requestId:'r1',source:'Skills: Swift',sourceId:'skills',score:1,category:'supported',calibrationVersion:'test-control-only'}}/>));
 const button=host.querySelector('button')!;
 await act(async()=>button.focus());expect(document.querySelector('[role=tooltip]')?.textContent).toContain('Skills: Swift');
 await act(async()=>button.click());expect(button.getAttribute('aria-expanded')).toBe('true');
 await act(async()=>button.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(document.querySelector('[role=tooltip]')).toBeNull();
 await act(async()=>button.click());expect(document.querySelector('[role=tooltip]')).not.toBeNull();
 await act(async()=>root.unmount());host.remove();
});
it('streaming narration leaves plain Markdown and renders source-grounded correction notes',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const fetch=vi.fn();vi.stubGlobal('fetch',fetch);
 await act(async()=>root.render(<ConversationProvider value={{enabled:true,activeRequestId:'r1',requestStatus:'loading',correctionsByRequest:{r1:['Swift / iOS is listed as 11 years, not 25.']}}}><ChatMessage requestId="r1" role="assistant" content="**25 years of Swift**"/></ConversationProvider>));
 expect(host.querySelector('strong')?.textContent).toBe('25 years of Swift');expect(host.querySelector('[role=note]')?.textContent).toContain('not 25');
 expect(host.querySelector('button[aria-describedby]')).toBeNull();expect(fetch).not.toHaveBeenCalled();
 await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();
});

it('batches receipts once after fit commentary commits, bound to the revised final narration',async()=>{
 (globalThis as any).ResizeObserver=class{observe(){}disconnect(){}};
 const requestId='receipt-fit-race';const receiptRequests:any[]=[];
 const board={requestId,role:'Engineer',company:'Example',description:'React',requirements:[{id:'r1',text:'React',start:0,end:5}],evidence:[{id:'domios',project:'domios',name:'Domios',text:'React'}],pairs:[{requirementId:'r1',sourceId:'domios',score:4,probabilities:{'0':0,'1':0,'2':0,'3':0,'4':1}}],available:true};
 vi.stubGlobal('fetch',vi.fn(async(url,options)=>{
  if(url==='/api/match')return new Response(`data: ${JSON.stringify({board})}\n\ndata: ${JSON.stringify({requestId,commentary:'Grounded commentary'})}\n\ndata: [DONE]\n\n`);
  const body=JSON.parse(options.body);receiptRequests.push(body);
  return Response.json({...body,available:true,receipts:[{id:'claim-0',requestId,start:2,end:7,text:'React',source:'Domios: React',sourceId:'domios',score:.95,category:'supported',calibrationVersion:'claims-v1-frozen-2026-10-28'}]});
 }));
 function Harness(){const [content,setContent]=React.useState('**React**');return <PortfolioDataProvider data={{projects:[],config:{}} as any}><ConversationProvider value={{enabled:true,activeRequestId:requestId,requestStatus:'complete',onFitCommentary:(_,text)=>setContent('**React**\n\n'+text)}}><JobMatchPanel role="Engineer" company="Example" description="React"/><ChatMessage requestId={requestId} role="assistant" content={content} toolCalls={[{name:'match_job',arguments:{role:'Engineer',description:'React'}}]}/><ChatMessage requestId={requestId} role="assistant" content={content} toolCalls={[{name:'match_job',arguments:{role:'Engineer',description:'React'}}]}/></ConversationProvider></PortfolioDataProvider>;}
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(<Harness/>));
 expect(receiptRequests).toHaveLength(1);expect(receiptRequests[0].content).toContain('Grounded commentary');
 expect(host.querySelectorAll('button[aria-label="Supported by portfolio source"]')).toHaveLength(2);
 await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();
});
