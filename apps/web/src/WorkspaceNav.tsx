import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { NavIcon } from './Overview';

export default function WorkspaceNav({tab,onNavigate,onExample,real,cloud,busy}:{tab:string;onNavigate:(tab:string)=>void;onExample:()=>void;real:boolean;cloud:boolean;busy:boolean}) {
  const reduced=useReducedMotion();
  const [more,setMore]=useState(false);
  useEffect(()=>{const query=window.matchMedia('(min-width:861px)');const update=()=>setMore(tab!=='Overview'&&query.matches);update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[tab]);
  return <aside className="sidebar">
    <a className="brand" href="#workspace" onClick={e=>{e.preventDefault();onNavigate('Overview');}}><span className="mark"><svg aria-hidden="true" viewBox="0 0 28 32"><path d="M14 2C11 9 4 15 4 21a10 10 0 0 0 20 0C24 15 17 9 14 2Z" fill="currentColor"/><path d="M8 22c0 4 3 6 6 6" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg></span><span>JalSetu<small>WATER RELIEF WORKSPACE</small></span></a>
    <nav aria-label="Project navigation">
      <span className="nav-caption">WORKSPACE</span>
      {[['Overview','Home'],['Inputs','Set up'],['Plan','Your plan'],['Operations','Deliveries']].map(([name,label],index)=><button key={name} aria-current={tab===name?'page':undefined} className={tab===name?'nav active':'nav'} onClick={()=>onNavigate(name)}><NavIcon name={name}/><span>{label}</span>{tab===name&&<m.span className="nav-current-pill" layoutId="workspace-nav-active" transition={{duration:reduced?0:.25}}/>}{index>0&&<small aria-hidden="true">0{index}</small>}</button>)}
      <span className="nav-caption review-caption">REVIEW & LEARN</span>
      <details className="more-nav" open={more} onToggle={e=>setMore(e.currentTarget.open)}><summary>More <span aria-hidden="true">⌄</span></summary><div>{[['Compare','Compare options'],...(real&&!cloud?[['History','Original plan']]:[]),['Evidence',real?'About the records':'About the example']].map(([name,label])=><button key={name} aria-current={tab===name?'page':undefined} className={tab===name?'nav active':'nav'} onClick={()=>{onNavigate(name);if(!window.matchMedia('(min-width:861px)').matches)setMore(false);}}><NavIcon name={name}/><span>{label}</span></button>)}</div></details>
    </nav>
    <div className="nav-help"><NavIcon name="Evidence"/><strong>A little guidance goes a long way.</strong><p>Try a sample run. We’ll walk you through each step.</p><button className="nav-example" disabled={busy} onClick={onExample}>Try the guided example</button></div>
    <a className="repo-link" href="https://github.com/singh-himanshu3/jalsetu" target="_blank" rel="noreferrer">View on GitHub ↗</a>
    <span className="shell-status"><span className="status-dot"/>{cloud?'Hosted example':'Local workspace'}<small>Delhi pilot · IST</small></span>
  </aside>;
}
