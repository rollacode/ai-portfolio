'use client';
import { useId, useState, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { brandSpring } from '../../lib/motion';
import type { Receipt } from '../../lib/evidence/receipts';
export default function ReceiptDot({receipt}: {receipt: Receipt}) {
  const id = useId();
  const [open,setOpen] = useState(false);
  const [focused,setFocused] = useState(false);
  const reduced = useReducedMotion();
  const button = useRef<HTMLButtonElement>(null);
  const [position,setPosition] = useState({left:12,top:12,below:false,width:256});
  useLayoutEffect(()=>{
    if(!open)return;
    const locate=()=>{const rect=button.current?.getBoundingClientRect();if(!rect)return;const width=Math.min(288,window.innerWidth-24);setPosition({left:Math.max(12,Math.min(rect.left,window.innerWidth-width-12)),top:rect.top<80?rect.bottom+8:rect.top-8,below:rect.top<80,width});};
    locate();window.addEventListener('resize',locate);window.addEventListener('scroll',locate,true);
    return()=>{window.removeEventListener('resize',locate);window.removeEventListener('scroll',locate,true);};
  },[open]);
  const label = receipt.category === 'supported' ? 'Supported by portfolio source' : 'My take: interpretation';
  return <span className="relative inline-block h-[0.6em] w-[0.5em] align-super" onMouseEnter={()=>setOpen(true)} onMouseLeave={()=>{if(!focused)setOpen(false);}}>
    <motion.button ref={button} type="button" aria-label={label} aria-expanded={open} aria-describedby={open ? id : undefined}
      onFocus={()=>{setFocused(true);setOpen(true);}} onBlur={()=>{setFocused(false);setOpen(false);}} onClick={()=>setOpen(true)} onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);e.stopPropagation();}}}
      initial={reduced ? false : {scale:.8,opacity:0}} animate={{scale:1,opacity:1}} transition={reduced ? {duration:0} : {...brandSpring, duration:0.25}}
      className={`absolute -left-1.5 -top-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime-500 ${receipt.category==='supported'?'text-lime-600 dark:text-lime-400':'text-amber-600 dark:text-amber-400'}`}>
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${receipt.category==='supported'?'bg-current':'border border-current'}`} />
    </motion.button>
    {open && createPortal(<span id={id} role="tooltip" style={{position:"fixed",left:position.left,top:position.top,width:position.width,transform:position.below?undefined:"translateY(-100%)"}} className="z-[100] rounded-[10px_14px_10px_14px] border border-gray-900/10 bg-gray-50 px-3 py-2 text-xs font-normal leading-relaxed text-gray-700 shadow-lg dark:border-white/10 dark:bg-gray-900 dark:text-gray-200">{label}: {receipt.source}</span>,document.body)}
  </span>;
}
