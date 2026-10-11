import {useId,useState} from 'react';
import {m,useReducedMotion} from 'motion/react';
import {ChartNoAxesCombined,ClipboardCheck,Droplets,MapPinned,Plus,Truck} from 'lucide-react';
import {Reveal} from './Motion';

export function LandingServices({busy,onAction,highlight=false}:{busy:boolean;onAction:(tab:string)=>void;highlight?:boolean}) {
  return <section className="landing-services" id="services" aria-labelledby="services-title">
    <Reveal className="service-heading"><span className="eyebrow">WORKSPACE CAPABILITIES</span><h2 id="services-title">From requests to delivery records.</h2><p>Sample workflow: prepare resources, compare a plan, approve it and record deliveries. Review the remaining plan when a vehicle breaks down.</p></Reveal>
    <div id="how-it-works" className="service-process"><h3>How a run works</h3><ol>{[['Inputs','Inputs'],['Plan','Generate plan'],['Plan','Approve'],['Operations','Track delivery'],['Operations','Replan']].map(([tab,label],index)=><li key={label}><button disabled={busy} onClick={()=>onAction(tab)}><span>{index+1}</span>{label}</button></li>)}</ol></div>
    <div className="service-grid">
      <Reveal className="service-card service-planning"><div className="service-card-label"><MapPinned size={21}/><span>Plan</span></div><h3>Allocate water within your resources</h3><p>Check available stock, vehicle capacity and receiving windows before reviewing a proposed allocation.</p><div className="allocation-visual" aria-label="Illustrative allocation only, not a calculated plan"><span>Before planning</span>{['Depot stock','Vehicle capacity','Receiving windows'].map(label=><div className="allocation-row" key={label}><span>{label}</span></div>)}<small>Unmet requests remain visible.</small></div><span className="service-foot"><Droplets size={15}/> Stock, capacity and receiving windows are checked.</span></Reveal>
      <Reveal className="service-card service-compare" delay={.06}><div className="service-card-label"><ChartNoAxesCombined size={21}/><span>Compare</span></div><h3>Compare plans before approval</h3><p>Compare planning strategies using the same inputs. Review coverage and travel estimates before deciding.</p><div className="comparison-visual" aria-label="Illustrative strategy cards"><span><i/>Demand-proportional baseline</span><span className="comparison-choice"><i/>JalSetu proposal</span><small>Compare using the same resources</small></div></Reveal>
      <Reveal className="service-card service-deliver" delay={.1}><div className="service-card-label"><Truck size={21}/><span>Deliver</span></div><h3>Keep delivery records</h3><p>Review vehicle routes and stop lists, open Google Maps for directions, and record loading and deliveries.</p><div className="delivery-visual"><span><ClipboardCheck size={17}/>Coordinator approval</span><div className="delivery-line" aria-hidden="true"/><span><MapPinned size={17}/>Driver route &amp; stops</span><div className="delivery-line" aria-hidden="true"/><span><Droplets size={17}/>Reported deliveries</span></div><span className="service-foot">Plan approval and delivery reports stay separate.</span></Reveal>
      <Reveal className={`service-card service-replan${highlight?' disruption-highlight':''}`} delay={.14}><div id="disruption" tabIndex={-1}><div className="service-card-label"><ClipboardCheck size={21}/><span>Adapt</span></div><h3>Review remaining deliveries</h3><p>Account for recovered water after a breakdown or closure. Review remaining deliveries and keep earlier reports.</p><div className="revision-visual"><span className="preview-badge">Sample · Disrupted → Revised</span><span>Earlier deliveries</span><strong>Stay recorded</strong><span>Remaining requests</span><strong>Ready for review</strong></div></div></Reveal>
    </div>
  </section>;
}

function Question({question,answer}:{question:string;answer:string}) {
  const [open,setOpen]=useState(false);
  const id=useId(),reduced=useReducedMotion();
  return <div className={`faq-item${open?' is-open':''}`}>
    <h3><button id={`${id}-trigger`} type="button" aria-expanded={open} aria-controls={`${id}-answer`} onClick={()=>setOpen(value=>!value)}><span>{question}</span><m.span className="faq-plus" aria-hidden="true" animate={{rotate:open?45:0}} transition={{duration:reduced?0:.3}}><Plus size={20}/></m.span></button></h3>
    <m.div id={`${id}-answer`} role="region" aria-labelledby={`${id}-trigger`} aria-hidden={!open} initial={false} animate={{height:open?'auto':0,opacity:open?1:0}} transition={{duration:reduced?0:.42,ease:[.22,1,.36,1]}} className="faq-answer"><p>{answer}</p></m.div>
  </div>;
}

export function LandingQuestions() {
  return <section className="home-questions" id="questions" aria-labelledby="questions-title"><div className="faq-heading"><span className="eyebrow">BEFORE YOUR FIRST RUN</span><h2 id="questions-title">Questions about<br/>using JalSetu.</h2><p>Details about example data, driver maps and access to the workspace.</p></div><div className="faq-list">
    <Question question="Do I need to enter everything to try it?" answer="No. The guided example starts with sample stock, vehicles and requests already filled in. You choose the two operating rules and review each step."/>
    <Question question="Will it send vehicles or change real records?" answer="The example does not dispatch vehicles. You approve a plan and explicitly save each loading or delivery report. Sample data is labelled throughout."/>
    <Question question="Can drivers see their route?" answer="Yes. An approved run includes a map and ordered stops for each vehicle, with links to Google Maps for directions. The landing illustration is a schematic, not a real road route."/>
    <Question question="Can I use my own requests later?" answer="The local workspace supports saved projects and CSV previews for operator-entered records. You review the source, locations and road estimates before planning. The hosted demo currently uses examples only."/>
    <Question question="Do I need an account?" answer="You can explore this page without signing in. Create an account with your email and a password to use the workspace. Each signed-in account has its own sample plans and reports."/>
  </div></section>;
}
