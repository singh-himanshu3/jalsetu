import { useState } from 'react';
import { m, useReducedMotion } from 'motion/react';
import { ArrowRight, ArrowUpRight, Droplets, Truck, MapPinned, ShieldCheck, SlidersHorizontal, ChartNoAxesCombined, House, ClipboardCheck, RotateCcw, MousePointer2, CircleCheck, Layers3 } from 'lucide-react';
import type { Input } from './App';
import { Reveal } from './Motion';
import {LandingServices,LandingQuestions} from './LandingServices';

type Props = {input:Input|null;busy:boolean;onLoad:()=>void;onNavigate:(tab:string)=>void;hasPlan:boolean;publicView?:boolean};
export function NavIcon({name}:{name:string}) {
  const Icon=({Overview:House,Inputs:SlidersHorizontal,Plan:MapPinned,Operations:Truck,Compare:ChartNoAxesCombined,History:ClipboardCheck,Evidence:ShieldCheck} as const)[name as 'Overview']??Layers3;
  return <Icon aria-hidden="true" size={20} strokeWidth={1.7}/>;
}
const scenes=[
  {label:'Plan',title:'A clear route. A clear reason.',copy:'See the depot and receiving points together. Review who gets water, how much and when.',status:'Review the proposed stops',color:'#7abff0'},
  {label:'Review',title:'You make the final call.',copy:'Check quantities, time windows and unmet requests before you approve. Approval does not dispatch water.',status:'Coordinator approval required',color:'#f6cc7a'},
  {label:'Report',title:'Keep the whole run in view.',copy:'Record loading and deliveries. If a vehicle breaks down, account for its water before replanning.',status:'Reports are entered by your team',color:'#90dbe0'},
];
const previewStops=[{x:225,y:126,name:'Receiving point A',reason:'Review its request and receiving window.'},{x:399,y:212,name:'Receiving point B',reason:'Check its planned quantity and arrival estimate.'},{x:312,y:351,name:'Receiving point C',reason:'Keep any unmet request visible.'}];
function PlanningPreview() {
  const [scene,setScene]=useState(0),[selected,setSelected]=useState(0),[replay,setReplay]=useState(0);
  const reduced=useReducedMotion();
  const detail=previewStops[selected],current=scenes[scene];
  return <div className="planning-preview">
    <div className="preview-heading"><span><Droplets size={16}/> THE RELIEF RUN</span><span className="preview-badge">Interactive illustration</span></div>
    <div className="preview-stages" role="group" aria-label="Explore the planning workflow">{scenes.map((item,index)=><button key={item.label} aria-pressed={scene===index} onClick={()=>setScene(index)}><span>0{index+1}</span>{item.label}{scene===index&&<m.span layoutId="preview-stage" className="preview-stage-pill" transition={{duration:reduced?0:.25}}/>}</button>)}</div>
    <div className="preview-map">
      <svg viewBox="0 0 560 440" role="img" aria-label="Illustrative depot connected to three receiving points. Schematic only, not road geometry or live positions.">
        <defs><pattern id="relief-grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#8d9bab" opacity=".2"/></pattern><linearGradient id="relief-river" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#2b4f78"/><stop offset="1" stopColor="#163f47"/></linearGradient></defs>
        <rect width="560" height="440" fill="url(#relief-grid)"/>
        <path d="M475-30C374 91 500 119 446 210S461 354 373 480" fill="none" stroke="url(#relief-river)" strokeWidth="42" opacity=".6"/>
        <g fill="#29394b" stroke="#475462" strokeWidth=".7"><rect x="58" y="43" width="91" height="49" rx="6"/><rect x="265" y="49" width="83" height="30" rx="6"/><rect x="62" y="310" width="97" height="73" rx="6"/><rect x="456" y="301" width="56" height="94" rx="6"/><rect x="253" y="235" width="80" height="61" rx="6"/><rect x="378" y="72" width="64" height="65" rx="6"/></g>
        <g fill="none" stroke="#405062" strokeWidth="11"><path d="M-20 170H142L225 90H580M-20 289H148L254 179H580M112-10V460M354-10V440"/></g>
        <g fill="none" stroke="#919fae" opacity=".3" strokeWidth="1" strokeDasharray="3 6"><path d="M-20 170H142L225 90H580M-20 289H148L254 179H580M112-10V460M354-10V440"/></g>
        <path d="M112 247L225 126L399 212L312 351L112 247" fill="none" stroke="#758699" strokeWidth="2" strokeDasharray="4 7"/>
        <m.path key={`${scene}:${replay}`} d="M112 247L225 126L399 212L312 351L112 247" fill="none" stroke={current.color} strokeWidth="3" strokeLinecap="round" initial={reduced?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:1.8,ease:'easeInOut'}}/>
        <g fontFamily="DM Sans, sans-serif" fontSize="9" letterSpacing="2" fill="#b3bfc8"><text x="36" y="122">NORTH DELHI</text><text x="462" y="262" transform="rotate(-78 462 262)">YAMUNA</text><text x="65" y="285">WATER DEPOT</text></g>
        <circle cx="112" cy="247" r="28" fill="#7abff0" opacity=".12"/><rect x="95" y="230" width="34" height="34" rx="10" fill="#7abff0"/>
        <path d="M112 236c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12Z" fill="#17293d"/>
        {previewStops.map((point,index)=><g key={point.name}><circle cx={point.x} cy={point.y} r={selected===index?29:22} fill={current.color} opacity={selected===index?.2:.07}/><circle cx={point.x} cy={point.y} r="15" fill="#1d2d40" stroke={current.color} strokeWidth="2"/><text x={point.x} y={point.y+4} textAnchor="middle" fill="white" fontSize="12">{index+1}</text></g>)}
      </svg>
      <div className="preview-map-caption"><span className="preview-north">↑ N</span><span>Schematic · sample locations</span><button aria-label="Replay route illustration" onClick={()=>setReplay(n=>n+1)}><RotateCcw size={14}/>Replay</button></div>
      <div className="preview-stop-buttons" role="group" aria-label="Preview a receiving point">{previewStops.map((point,index)=><button key={point.name} aria-label={`Preview ${point.name}`} aria-pressed={selected===index} className={selected===index?'selected':''} onClick={()=>setSelected(index)}>{index+1}</button>)}<span><MousePointer2 size={12}/> Pick a point</span></div>
      <div aria-live="polite" aria-atomic="true"><m.div key={selected} className="preview-stop-card" initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.25}}><span className="preview-stop-icon"><MapPinned size={19}/></span><div><strong>{detail.name}</strong><span>{detail.reason}</span></div><ArrowUpRight size={18}/></m.div></div>
    </div>
    <div className="preview-status"><CircleCheck size={15}/><span>{current.status}</span></div>
    <div className="preview-description" aria-live="polite" aria-atomic="true"><strong>{current.title}</strong><p>{current.copy}</p></div>
  </div>;
}
export default function Overview({input,busy,onLoad,onNavigate,hasPlan,publicView=false}:Props) {
  const confirmed=input?.sites.filter(site=>site.confirmation_status==='confirmed')??[];
  const requests=confirmed.reduce((sum,site)=>sum+Number(site.requested_litres??0),0);
  const stock=input?.depot.available_stock_litres;
  const stockLabel=typeof stock==='number'&&Number.isFinite(stock)?`${stock.toLocaleString('en-IN')} L`:'Not entered';
  const requestsLabel=confirmed.every(site=>typeof site.requested_litres==='number'&&Number.isFinite(site.requested_litres))?`${requests.toLocaleString('en-IN')} L`:'Needs review';
  return <>
    <section className="water-hero" aria-labelledby="relief-title">
      <Reveal className="water-hero-copy"><span className="hero-label"><Droplets size={13}/> WATER RELIEF, WITH A CLEAR PLAN</span><h1 id="relief-title">Every drop.<br/>A <em>clearer plan.</em></h1><p>Turn water requests into a relief run your team can follow.</p><p className="hero-support">Plan deliveries. Compare options. Give drivers a route. Keep every reported litre accounted for — all in one workspace.</p><div className="water-hero-actions"><button className="primary" disabled={busy} onClick={input?()=>onNavigate(hasPlan?'Plan':'Inputs'):onLoad}>{input?hasPlan?'Open your plan':'Continue setup':publicView?'Sign in to try the example':'Try the example'}<ArrowRight size={19}/></button><a href="#how-it-works">Explore how it works <span aria-hidden="true">↘</span></a></div><div className="hero-smallprint"><ShieldCheck size={16}/><span>Sample data. Guided steps. Nothing dispatched.</span></div>{input&&<button className="text-button new-example" disabled={busy} onClick={onLoad}>Start a new guided example <ArrowUpRight size={14}/></button>}<div className="hero-margin-note"><span className="margin-line"/> For water-relief coordinators <span>·</span> Delhi example · One depot · One day</div></Reveal>
      <Reveal className="preview-wrap" delay={.1}><div className="preview-orbit orbit-one"/><div className="preview-orbit orbit-two"/><PlanningPreview/><span className="preview-footnote">Explore the idea here. Try the example to calculate a plan.</span></Reveal>
    </section>
    <div className="home-divider"><span>THOUGHTFUL PLANNING. HUMAN CONTROL.</span><div><Droplets size={15}/> Water <span>→</span><Truck size={15}/> Vehicles <span>→</span><MapPinned size={15}/> Receiving points</div></div>
    <LandingServices/>
    <section className="workflow-section" id="how-it-works" aria-labelledby="workflow-title"><Reveal className="workflow-heading"><span className="eyebrow">FROM FIRST REQUEST TO LAST REPORT</span><h2 id="workflow-title">A complicated day.<br/><em>A simpler workflow.</em></h2><p>You don’t need to learn a system.<br/>Just take the next step.</p></Reveal><div className="workflow-cards">{[
      ['Inputs','01','Start with what you have.','Review the water, vehicles and confirmed requests in three short steps.','Review your setup'],
      ['Plan','02','See the whole picture.','Explore the stops, quantities and unmet requests. Compare options before you approve.','Review your plan'],
      ['Operations','03','Follow through.','Record what was loaded and delivered. Keep earlier reports when the remaining plan changes.','Track deliveries'],
    ].map(([tab,number,title,copy,action],index)=><Reveal key={tab} delay={index*.07}><article className="workflow-card"><div className="workflow-card-top"><span><NavIcon name={tab}/></span><b>{number}</b></div><h3>{title}</h3><p>{copy}</p><button className="text-button" disabled={busy} onClick={()=>input?onNavigate(tab):onLoad()}>{input?action:publicView?'Sign in to explore':'Try it in the example'}<ArrowUpRight size={17}/></button></article></Reveal>)}</div></section>
    {input&&<section className="panel current-draft"><div><span className="eyebrow">{input.data_mode==='operator_entered'?'YOUR RECORD-BASED PROJECT':'YOUR CURRENT EXAMPLE'}</span><h3>{input.name}</h3><p>{String(input.operating_date)} · {String(input.depot.name)} · IST</p></div><div className="draft-facts"><span><strong>{stockLabel}</strong>Depot stock</span><span><strong>{requestsLabel}</strong>Confirmed requests</span><span><strong>{input.vehicles.filter(v=>v.status==='available').length}</strong>Available vehicles</span></div><button className="secondary" onClick={()=>onNavigate('Inputs')}>Edit setup <ArrowRight size={15}/></button></section>}
    <Reveal className="evidence-feature"><div className="evidence-mark"><ShieldCheck strokeWidth={1}/></div><div><span className="eyebrow">EVERY CLAIM HAS A LIMIT</span><h2>Clarity you can<br/><em>build on.</em></h2><p>Plans are estimates. Reports come from your team. The example uses sample resources and travel times; public-road research is presented separately.</p><button className="text-button" onClick={()=>publicView?window.open('https://github.com/singh-himanshu3/jalsetu','_blank','noopener,noreferrer'):onNavigate('Evidence')}>{publicView?'Explore the project on GitHub':'See what we’ve checked'} <ArrowUpRight size={17}/></button></div><div className="evidence-promises"><span><CircleCheck/>Checked quantities and time windows</span><span><CircleCheck/>Unmet requests stay visible</span><span><CircleCheck/>Approve before recording operations</span><span><CircleCheck/>No invented field results</span></div></Reveal>
    <LandingQuestions/>
    <Reveal className="home-final-cta"><span className="eyebrow">YOUR NEXT RELIEF RUN STARTS HERE</span><h2>Your next run.<br/><em>A clearer way forward.</em></h2><button className="primary" disabled={busy} onClick={onLoad}>{publicView?'Sign in to try the example':'Try the guided example'} <ArrowRight size={19}/></button><span className="hint">{publicView?'Invited demo accounts · Sample data · Guided steps':'A filled-in example. One step at a time.'}</span></Reveal>
  </>;
}
