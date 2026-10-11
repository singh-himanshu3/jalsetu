import {useId,useState} from 'react';
import {m,useReducedMotion} from 'motion/react';
import {ArrowUpRight,ChartNoAxesCombined,ClipboardCheck,Droplets,MapPinned,Plus,Truck} from 'lucide-react';
import {Reveal} from './Motion';

export function LandingServices() {
  return <section className="landing-services" id="services" aria-labelledby="services-title">
    <Reveal className="service-heading"><span className="eyebrow">ONE WORKSPACE. THE WHOLE RUN.</span><h2 id="services-title">From a water request<br/>to a <em>clear next step.</em></h2><p>For the coordinator bringing water, vehicles and people together. See the plan, make the call, and keep the team’s reports in one place.</p></Reveal>
    <div className="service-grid">
      <Reveal className="service-card service-planning"><div className="service-card-label"><MapPinned size={21}/><span>01 / PLAN</span></div><h3>Make limited water<br/>go where it’s needed.</h3><p>Bring depot stock, vehicle capacity and confirmed requests together. Review proposed stops, quantities and arrival estimates.</p><div className="allocation-visual" aria-label="Illustrative allocation only, not a calculated plan"><span>EXAMPLE PLANNING VIEW</span><div><span>Depot stock</span><strong>Available water</strong></div>{[['Receiving point A','72%'],['Receiving point B','54%'],['Receiving point C','38%']].map(([label,width])=><div className="allocation-row" key={label}><span>{label}</span><div><i style={{width}}/></div></div>)}<small>Unmet requests stay visible in the calculated plan.</small></div><span className="service-foot"><Droplets size={15}/> Every litre has a place in the plan.</span></Reveal>
      <Reveal className="service-card service-compare" delay={.06}><div className="service-card-label"><ChartNoAxesCombined size={21}/><span>02 / COMPARE</span></div><h3>See the tradeoffs.<br/>Choose with confidence.</h3><p>Compare planning strategies using the same inputs. Review coverage and travel estimates before deciding.</p><div className="comparison-visual" aria-label="Illustrative strategy cards"><span><i/>Demand-proportional baseline</span><span className="comparison-choice"><i/>JalSetu proposal<ArrowUpRight size={16}/></span><small>Estimated plans · separate from delivery reports</small></div></Reveal>
      <Reveal className="service-card service-deliver" delay={.1}><div className="service-card-label"><Truck size={21}/><span>03 / DELIVER</span></div><h3>A route your team<br/>can follow.</h3><p>Approve the plan, view each vehicle’s stop list and map, and open Google Maps for directions. Record loading and delivery as they happen.</p><div className="delivery-visual"><span><ClipboardCheck size={17}/>Coordinator approval</span><div className="delivery-line"/><span><MapPinned size={17}/>Driver route &amp; stops</span><div className="delivery-line"/><span><Droplets size={17}/>Reported deliveries</span></div><span className="service-foot">Approval records a decision; it does not dispatch vehicles.</span></Reveal>
      <Reveal className="service-card service-replan" delay={.14}><div className="service-card-label"><ClipboardCheck size={21}/><span>04 / ADAPT</span></div><h3>When the day changes,<br/>keep the facts.</h3><p>Record a breakdown or a closed receiving point. Account for recovered water, review a revised plan, and retain earlier reports.</p><div className="revision-visual"><span>Earlier deliveries</span><strong>Stay recorded</strong><span>Remaining requests</span><strong>Ready for review</strong></div></Reveal>
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
  return <section className="home-questions" id="questions" aria-labelledby="questions-title"><div className="faq-heading"><span className="eyebrow">BEFORE YOUR FIRST RUN</span><h2 id="questions-title">A little clarity.<br/><em>Then you’re ready.</em></h2><p>No manual to read. Start with a guided example and take it one step at a time.</p></div><div className="faq-list">
    <Question question="Do I need to enter everything to try it?" answer="No. The guided example starts with sample stock, vehicles and requests already filled in. You choose the two operating rules and review each step."/>
    <Question question="Will it send vehicles or change real records?" answer="The example does not dispatch vehicles. You approve a plan and explicitly save each loading or delivery report. Sample data is labelled throughout."/>
    <Question question="Can drivers see their route?" answer="Yes. An approved run includes a map and ordered stops for each vehicle, with links to Google Maps for directions. The landing illustration is a schematic, not a real road route."/>
    <Question question="Can I use my own requests later?" answer="The local workspace supports saved projects and CSV previews for operator-entered records. You review the source, locations and road estimates before planning. The hosted demo currently uses examples only."/>
    <Question question="Do I need an account?" answer="You can explore this page without signing in. The hosted workspace currently requires an invited demo account to keep sample plans and reports separate. The local version can be tried without an account."/>
  </div></section>;
}
