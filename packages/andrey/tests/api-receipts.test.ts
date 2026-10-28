import {describe,it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
const ask=vi.hoisted(()=>vi.fn());
vi.mock('@ai-portfolio/core/lib/jev',()=>({askJev:ask}));
import {POST} from '../app/api/receipts/route';
function request(body:unknown){return new NextRequest('http://localhost/api/receipts',{method:'POST',body:JSON.stringify(body),headers:{'Content-Type':'application/json','x-forwarded-for':Math.random().toString()}});}
beforeEach(()=>ask.mockReset());
describe('receipts request boundary',()=>{
 it('ignores client-supplied scores and sources, uses server evidence and a single bounded batch',async()=>{
  ask.mockResolvedValue({available:true,answers:{'claim-0':{type:'noul',noul:0.9}}});
  const res=await POST(request({requestId:'req-1',content:'**React**',score:1,source:'Fabricated source'}));const body=await res.json();
  expect(body.receipts).toHaveLength(1);expect(body.receipts[0].source).not.toContain('Fabricated');
  expect(ask).toHaveBeenCalledTimes(1);expect(ask.mock.calls[0][0].deadlineMs).toBe(1500);
  expect(JSON.stringify(ask.mock.calls[0][0].state.evidence)).toContain('Domios');expect(JSON.stringify(ask.mock.calls[0][0].state)).not.toContain('Fabricated');
 });
 it('keeps contradicted surrounding statements unmarked even if a term and raw score match',async()=>{
  ask.mockResolvedValue({available:true,answers:{'claim-0':{type:'noul',noul:1}}});
  const body=await (await POST(request({requestId:'req-2',content:'Domios is implemented entirely in **React** without Rust.'}))).json();
  expect(body.receipts).toEqual([]);
 });
 it('rejects oversized bodies and invalid request identifiers without calling Jev',async()=>{
  expect((await POST(request({requestId:'../../bad',content:'**React**'}))).status).toBe(400);
  expect((await POST(request({requestId:'req-2',content:'x'.repeat(16001)}))).status).toBe(400);
  expect(ask).not.toHaveBeenCalled();
 });
 it('fails open to no marks on unavailable service results',async()=>{
  ask.mockResolvedValue({available:false,reason:'credits'});
  const body=await (await POST(request({requestId:'req-3',content:'**React**'}))).json();
  expect(body.available).toBe(false);expect(body.receipts).toEqual([]);
 });
});
