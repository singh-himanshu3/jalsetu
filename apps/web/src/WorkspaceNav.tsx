import { useEffect, useState, useRef } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { NavIcon } from './Overview';

export default function WorkspaceNav({tab,onNavigate,onExample,real,cloud,busy,guideActive=false}:{tab:string;onNavigate:(tab:string)=>void;onExample:()=>void;real:boolean;cloud:boolean;busy:boolean;guideActive?:boolean}) {
  const [drawer,setDrawer]=useState(false);
  const panel=useRef<HTMLElement>(null),menu=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!drawer)return;const previous=document.activeElement as HTMLElement|null;const old=document.body.style.overflow;const content=document.getElementById('workspace');if(content)content.inert=true;document.body.style.overflow='hidden';panel.current?.querySelector<HTMLElement>('a,button')?.focus();const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setDrawer(false);event.preventDefault();}if(event.key==='Tab'){const nodes=Array.from(panel.current?.querySelectorAll<HTMLElement>('a,button,summary')??[]).filter(el=>el.getClientRects().length);const first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}};window.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;if(content)content.inert=false;window.removeEventListener('keydown',key);(previous??menu.current)?.focus();};},[drawer]);
  const go=(next:string)=>{setDrawer(false);onNavigate(next);};
  const reduced=useReducedMotion();
  const [more,setMore]=useState(false);
  useEffect(()=>{const query=window.matchMedia('(min-width:861px)');const update=()=>{setMore(tab!=='Overview'&&query.matches);if(query.matches)setDrawer(false);};update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[tab]);
  return <><button ref={menu} className="workspace-menu secondary" aria-expanded={drawer} aria-controls="workspace-navigation" onClick={()=>setDrawer(!drawer)}>Menu</button>{drawer&&<button className="drawer-backdrop" aria-label="Close navigation" onClick={()=>setDrawer(false)}/>}<aside ref={panel} id="workspace-navigation" role={drawer?'dialog':undefined} aria-modal={drawer?true:undefined} aria-label="Workspace navigation" className={`sidebar ${drawer?'drawer-open':''}`}>
    <a className="brand" href="#workspace" onClick={e=>{e.preventDefault();go('Overview');}}><span className="mark"><svg aria-hidden="true" viewBox="0 0 28 32"><path d="M14 2C11 9 4 15 4 21a10 10 0 0 0 20 0C24 15 17 9 14 2Z" fill="currentColor"/><path d="M8 22c0 4 3 6 6 6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg></span><span>JalSetu<small>Water relief</small></span></a>
    <nav aria-label="Project navigation">
      <span className="nav-caption">Workspace</span>
      {[['Overview','Home'],['Inputs','Set up'],['Plan','Your plan'],['Operations','Deliveries']].map(([name,label])=><button key={name} aria-current={tab===name?'page':undefined} className={tab===name?'nav active':'nav'} onClick={()=>go(name)}><NavIcon name={name}/><span>{label}</span>{tab===name&&<m.span className="nav-current-pill" layoutId="workspace-nav-active" transition={{duration:reduced?0:.25}}/>}</button>)}
      <span className="nav-caption review-caption">Review</span>
      <details className="more-nav" open={more} onToggle={e=>setMore(e.currentTarget.open)}><summary>More <span aria-hidden="true">⌄</span></summary><div>{[['Compare','Compare options'],...(real&&!cloud?[['History','Original plan']]:[]),['Evidence',real?'About the records':'About the example']].map(([name,label])=><button key={name} aria-current={tab===name?'page':undefined} className={tab===name?'nav active':'nav'} onClick={()=>{go(name);if(!window.matchMedia('(min-width:861px)').matches)setMore(false);}}><NavIcon name={name}/><span>{label}</span></button>)}</div></details>
    </nav>
    {!guideActive&&<div className="nav-help"><NavIcon name="Evidence"/><strong>A little guidance goes a long way.</strong><p>Try a sample run. We’ll walk you through each step.</p><button className="nav-example" disabled={busy} onClick={onExample}>Try the guided example</button></div>}
    <a className="repo-link" href="https://github.com/singh-himanshu3/jalsetu" target="_blank" rel="noreferrer">View on GitHub ↗</a>
    <span className="shell-status"><span className="status-dot"/>{cloud?'Hosted example':'Local workspace'}<small>Delhi pilot · IST</small></span>
  </aside></>;
}
