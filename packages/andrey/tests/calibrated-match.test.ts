import {describe,it,expect,vi} from 'vitest';
import {calibratedMatch} from '../lib/calibrated-match';
const description='React\nRust';
const input={requestId:'req-1',role:'Engineer',company:'Example',description};
const extraction={role:'Engineer',company:'Example',requirements:[{id:'r1',text:'React',start:0,end:5},{id:'r2',text:'Rust',start:6,end:10}]};
const probabilities={'0':0,'1':0,'2':0,'3':1,'4':0};
describe('calibrated match request pipeline',()=>{
 it('extracts once, scores all requirements once, then reads the board into commentary without another model call',async()=>{
  vi.stubEnv('AI_API_KEY','test');
  const complete=vi.fn().mockResolvedValueOnce(JSON.stringify(extraction));
  const ask=vi.fn().mockResolvedValue({available:true,answers:{r1:{type:'score',score:3,probabilities},r2:{type:'score',score:0.4,probabilities:{'0':1,'1':0,'2':0,'3':0,'4':0}}}});
  const response=await calibratedMatch(input,new AbortController().signal,{complete,ask,evidence:()=>[{id:'domios',name:'Domios - A Home for AI Agents',project:'domios',text:'React and Rust'}]});
  const text=await response.text();
  expect(complete).toHaveBeenCalledTimes(1);expect(ask).toHaveBeenCalledTimes(1);
  expect(complete.mock.calls[0][0][1].content).toContain('React\\nRust');
  expect(text.indexOf('"board"')).toBeLessThan(text.indexOf('"commentary"'));
  expect(text).toContain('Andrey is strong on React (Domios).');
  expect(text).toContain('Rust isn’t documented in his portfolio yet.');
  expect(text).not.toMatch(/\d\.\d\d\/4/);
  vi.unstubAllEnvs();
 });
 it('keeps full JD and sends one honest fallback on Jev deadline without a narrative call',async()=>{
  vi.stubEnv('AI_API_KEY','test');
  const complete=vi.fn().mockResolvedValue(JSON.stringify(extraction));
  const ask=vi.fn().mockResolvedValue({available:false,reason:'deadline'});
  const response=await calibratedMatch(input,new AbortController().signal,{complete,ask,evidence:()=>[{id:'domios',text:'React'}]});
  const text=await response.text();
  expect(complete).toHaveBeenCalledTimes(1);expect(ask).toHaveBeenCalledTimes(1);
  expect(text).toContain('React\\nRust');expect(text).toContain('"pairs":[]');
  expect(text.match(/"commentary"/g)).toHaveLength(1);
  vi.unstubAllEnvs();
 });
 it('names only sources that exist on the board',async()=>{
  vi.stubEnv('AI_API_KEY','test');
  const complete=vi.fn().mockResolvedValueOnce(JSON.stringify(extraction));
  const ask=vi.fn().mockResolvedValue({available:true,answers:{r1:{type:'score',score:3,probabilities},r2:{type:'score',score:3,probabilities}}});
  const text=await (await calibratedMatch(input,new AbortController().signal,{complete,ask,evidence:()=>[{id:'domios',text:'React'}]})).text();
  expect(complete).toHaveBeenCalledTimes(1);
  expect(text).not.toContain('fake');expect(text).toContain('Andrey is strong on React and Rust.');
  vi.unstubAllEnvs();
 });
});
