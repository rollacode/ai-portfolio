// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot} from 'react-dom/client';
import {describe,it,expect,vi} from 'vitest';
import ToolCallBadge,{toolDecoration} from '../../core/src/components/chat/ToolCallBadge';
import {PortfolioDataProvider} from '../../core/src/context/PortfolioDataContext';
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
const projects=[{slug:'sos-portal',name:'SOS Portal - Healthcare'},{slug:'domios',name:'Domios - A Home for AI Agents'}];
describe('human tool decorations',()=>{
 it('maps tools to source project names and never exposes unknown raw names',()=>{
  expect(toolDecoration('show_project',{slug:'sos-portal'},projects)?.label).toBe('Opened SOS Portal');
  expect(toolDecoration('show_spotlight',{},projects,'Domios')?.label).toBe('Opened Domios');
  expect(toolDecoration('show_contact',{},projects)?.label).toBe('Opened contact');
  expect(toolDecoration('internal_debug_tool',{},projects)).toBeNull();
  expect(toolDecoration('show_project',{slug:'made-up'},projects)).toBeNull();
  expect(toolDecoration('remember_visitor',{name:'Private'},projects)).toBeNull();
 });
 it('reopens the actual known project with a focusable quiet control',async()=>{
  const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const navigate=vi.fn();
  await act(async()=>root.render(<PortfolioDataProvider data={{projects,config:{}} as any}><ToolCallBadge onNavigate={navigate} toolCalls={[{name:'show_project',arguments:{slug:'sos-portal'}}]}/></PortfolioDataProvider>));
  const button=host.querySelector('button')!;expect(button.textContent).toBe('Opened SOS Portal');expect(button.title).toContain('Reopen');
  await act(async()=>button.click());expect(navigate).toHaveBeenCalledWith({open:true,type:'project',slug:'sos-portal'});
  expect(host.textContent).not.toContain('I did');expect(host.textContent).not.toContain('show_project');
  await act(async()=>root.unmount());host.remove();
 });
});
