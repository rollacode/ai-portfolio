// @vitest-environment jsdom
import React, {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
import JobMatchPanel from '../../core/src/components/panels/JobMatchPanel';
import {ConversationProvider} from '../../core/src/context/ConversationContext';
import type {FitBoard} from '../../core/src/lib/evidence/fit';
let host:HTMLDivElement;let root:Root;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
(globalThis as any).ResizeObserver=class{observe(){}disconnect(){}};
const board:FitBoard={requestId:'req-1',role:'Engineer',company:'Example',description:'React',requirements:[{id:'r1',text:'React',start:0,end:5}],evidence:[{id:'domios',name:'Domios',project:'domios',text:'Canonical React source'}],pairs:[{requirementId:'r1',sourceId:'domios',score:3,probabilities:{'0':0,'1':0,'2':0,'3':1,'4':0}}],available:true};
function response(b:FitBoard){return new Response(`data: ${JSON.stringify({board:b})}\n\ndata: ${JSON.stringify({commentary:'Grounded commentary',requestId:b.requestId})}\n\ndata: [DONE]\n\n`);}
beforeEach(()=>{host=document.createElement('div');document.body.append(host);root=createRoot(host);});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe('Fit Board DOM and commentary sequence',()=>{
 // Off: owner removed Jev scoring from job match and fact marks from chat; kept for a possible return.
it.skip('commits board before commentary callback and exposes only computed levels',async()=>{
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response(board)));
   const callback=vi.fn(()=>{expect(host.textContent).toContain('Strong match');expect(host.textContent).toContain('React');});
   await act(async()=>{root.render(<ConversationProvider value={{enabled:true,activeRequestId:'req-1',onFitCommentary:callback}}><JobMatchPanel role="Engineer" company="Example" description="React"/></ConversationProvider>);});
   expect(callback).toHaveBeenCalledTimes(1);
   expect(host.querySelector('[role=meter]')?.getAttribute('aria-valuenow')).toBe('3');
   expect(host.textContent).not.toContain('boost');expect(host.textContent).not.toContain('confidence');
   expect(host.querySelector('svg path')).not.toBeNull();
 });
 // Off: owner removed Jev scoring from job match and fact marks from chat; kept for a possible return.
it.skip('shows the original JD without marks or numeric ring when unavailable',async()=>{
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...board,available:false,pairs:[]})));
   await act(async()=>{root.render(<ConversationProvider value={{enabled:true,activeRequestId:'req-1'}}><JobMatchPanel role="Engineer" company="Example" description="React"/></ConversationProvider>);});
   expect(host.textContent).toContain('I couldn’t compare the evidence');expect(host.textContent).toContain('View full job description');
   expect(host.querySelector('[role=meter]')).toBeNull();expect(host.textContent).not.toContain('70%');
 });
 it('ignores a board and commentary for a stale originating request',async()=>{
   vi.stubGlobal('fetch',vi.fn().mockResolvedValue(response({...board,requestId:'old'})));
   const callback=vi.fn();
   await act(async()=>{root.render(<ConversationProvider value={{enabled:true,activeRequestId:'req-1',onFitCommentary:callback}}><JobMatchPanel role="Engineer" company="Example" description="React"/></ConversationProvider>);});
   expect(callback).not.toHaveBeenCalled();expect(host.querySelector('[role=meter]')).toBeNull();
 });
});
