import {useState,type CSSProperties} from 'react';
import {m,useReducedMotion} from 'motion/react';
import {Droplets,MapPinned,RotateCcw,CircleCheck} from 'lucide-react';

const scenes=[
  {label:'Plan',copy:'Review proposed visits, quantities and unmet requests against stock and vehicle capacity.',color:'#197ac0',phase:'Proposed · Needs review'},
  {label:'Review',copy:'Illustrative approval: the coordinator has reviewed windows and gaps. Approval is separate from delivery reports.',color:'#946017',phase:'Approved'},
  {label:'Report',copy:'Record loading and deliveries. After a breakdown, keep earlier reports and review remaining work.',color:'#197ac0',phase:'Reported'},
];
const previewStops=[{x:225,y:126,name:'Receiving point 1',reason:'Review its request and receiving window.'},{x:399,y:212,name:'Receiving point 2',reason:'Check its planned quantity and arrival estimate.'},{x:312,y:296,name:'Receiving point 3',reason:'Keep any unmet request visible.'}];
export default function PlanningPreview() {
  const [scene,setScene]=useState(0),[selected,setSelected]=useState(0),[replay,setReplay]=useState(0);
  const reduced=useReducedMotion();
  const detail=previewStops[selected],current=scenes[scene];
  const detailCopy=scene===2?selected<2?'Completed delivery reports stay in the record.':'Review affected stops before recording a delivery.':scene===1?'Review quantity, receiving window and unmet request before approval.':detail.reason;
  return <div className="planning-preview" style={{'--preview-route':current.color} as CSSProperties}>
    <div className="preview-heading"><span><Droplets size={18}/> Delivery example</span><span className="preview-badge">Sample</span></div>
    <p className="preview-disclosure">Sample workflow · Illustrative plan · No vehicles dispatched</p>
    <p className="preview-instruction">Click through the workflow</p>
    <div className="preview-stages" role="group" aria-label="Explore the planning workflow">{scenes.map((item,index)=><button key={item.label} aria-pressed={scene===index} onClick={()=>setScene(index)}><span>0{index+1}</span>{item.label}{scene===index&&<m.span layoutId="preview-stage" className="preview-stage-pill" transition={{duration:reduced?0:.25}}/>}</button>)}</div>
    <div className="preview-map">
      <div className="preview-map-caption"><span className="preview-north">↑ N</span><span>Delhi schematic</span><button aria-label="Replay route illustration" onClick={()=>setReplay(n=>n+1)}><RotateCcw size={16}/>Replay</button></div>
      <svg viewBox="0 0 560 360" role="img" aria-label="Illustrative depot connected to three receiving points. Schematic only, not road geometry or live positions.">
        <defs><pattern id="relief-grid" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#8d9bab" opacity=".2"/></pattern><linearGradient id="relief-river" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#9ad4ee"/><stop offset="1" stopColor="#76bbdf"/></linearGradient></defs>
        <rect width="560" height="440" fill="url(#relief-grid)"/>
        <path d="M475-30C374 91 500 119 446 210S461 354 373 480" fill="none" stroke="url(#relief-river)" strokeWidth="42" opacity=".6"/>
        <g fill="#d3e7f4" stroke="#bbd6e8" strokeWidth=".7"><rect x="58" y="43" width="91" height="49" rx="6"/><rect x="265" y="49" width="83" height="30" rx="6"/><rect x="62" y="310" width="97" height="73" rx="6"/><rect x="456" y="301" width="56" height="94" rx="6"/><rect x="253" y="235" width="80" height="61" rx="6"/><rect x="378" y="72" width="64" height="65" rx="6"/></g>
        <g fill="none" stroke="#f6fbfe" strokeWidth="9"><path d="M-20 170H142L225 90H580M-20 289H148L254 179H580M112-10V460M354-10V440"/></g>
        <g fill="none" stroke="#9fbdd1" opacity=".3" strokeWidth="1" strokeDasharray="3 6"><path d="M-20 170H142L225 90H580M-20 289H148L254 179H580M112-10V460M354-10V440"/></g>
        <path d="M112 247L225 126L399 212L312 296L112 247" fill="none" stroke="#9dbbd0" strokeWidth="2" strokeDasharray="4 7"/>
        <m.path key={`${scene}:${replay}`} d={scene===2?"M112 247L225 126L399 212":"M112 247L225 126L399 212L312 296L112 247"} fill="none" stroke={current.color} strokeWidth="3" strokeLinecap="round" initial={reduced?false:{pathLength:0}} animate={{pathLength:1}} transition={{duration:reduced?0:1.8,ease:'easeInOut'}}/>
        {scene===2&&<path d="M399 212L312 296L112 247" fill="none" stroke="#197ac0" strokeWidth="3" strokeDasharray="7 7" opacity=".45"/>}
        <g fontFamily="DM Sans, sans-serif" fontSize="16" letterSpacing=".5" fill="#355b77"><text x="36" y="122">NORTH DELHI</text><text x="462" y="262" transform="rotate(-78 462 262)">YAMUNA</text><text x="65" y="285">WATER DEPOT</text></g>
        <circle cx="112" cy="247" r="28" fill="#197ac0" opacity=".12"/><rect x="95" y="230" width="34" height="34" rx="10" fill="#197ac0"/>
        <path d="M112 236c-3 5-7 8-7 12a7 7 0 0 0 14 0c0-4-4-7-7-12Z" fill="#ffffff"/>
        {previewStops.map((point,index)=><g key={point.name}><m.circle cx={point.x} cy={point.y} r={selected===index?29:23} fill={current.color} animate={{opacity:selected===index?.22:.06}} transition={{duration:reduced?0:.25}}/><m.circle initial={false} cx={point.x} cy={point.y} r="18" stroke={current.color} strokeWidth={selected===index?3:2} animate={{fill:selected===index||scene===2&&index<2?current.color:'#f8fcff'}} transition={{duration:reduced?0:.25}}/>{scene===2&&index<2?<path d={`M${point.x-7} ${point.y}l5 5 10-11`} fill="none" stroke="white" strokeWidth="3"/>:<text x={point.x} y={point.y+5} textAnchor="middle" fill={selected===index?'white':'#244e70'} fontSize="16">{index+1}</text>}</g>)}
      </svg>
      <div className="preview-stop-buttons" role="group" aria-label="Preview a receiving point">{previewStops.map((point,index)=><button key={point.name} aria-label={`Preview ${point.name}`} aria-pressed={selected===index} className={selected===index?'selected':''} onClick={()=>setSelected(index)}>{index+1}</button>)}<span>Choose a receiving point</span></div>
      <div aria-live="polite" aria-atomic="true"><m.div key={`${scene}:${selected}`} className="preview-stop-card" initial={reduced?false:{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{duration:reduced?0:.25}}><span className="preview-stop-icon"><MapPinned size={19}/></span><div><strong>{detail.name}</strong><span>{detailCopy}</span></div></m.div></div>
    </div>
    <ul className="preview-legend" aria-label="Map legend"><li><i className="legend-depot"/>Depot</li><li><i className="legend-route"/>Route</li><li><i className="legend-selected"/>Selected</li><li><i className="legend-point"/>Other point</li><li><CircleCheck size={14}/>Recorded report</li></ul>
    <div className="preview-description" aria-live="polite" aria-atomic="true"><m.div key={scene} initial={reduced?false:{opacity:0}} animate={{opacity:1}} transition={{duration:reduced?0:.25}}><strong className="preview-phase">{current.phase}</strong><p>{current.copy}</p></m.div></div>
  </div>;
}
