import { useEffect, useRef } from 'react';

import { exampleSteps } from './example-progress';

export function ExampleWelcome({ busy, onStart, onClose }: {busy:boolean;onStart:(guided:boolean)=>void;onClose:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} className="example-welcome" aria-labelledby="example-welcome-title" onCancel={onClose}>
    <button className="text-button welcome-close" aria-label="Close example introduction" onClick={onClose}>Close ×</button>
    <span className="eyebrow">YOUR FIRST RELIEF RUN</span><h2 id="example-welcome-title">Let’s plan it together.</h2>
    <p>Start with a filled-in sample. We’ll show you the next step as you go.</p>
    <ol>{exampleSteps.map((step,index) => <li key={step}><span>{index+1}</span>{step}</li>)}</ol>
    <p className="hint">Sample water, vehicles and requests. Nothing is dispatched. You choose the operating rules, approve the plan and save each report yourself.</p>
    <div className="actions"><button className="primary" disabled={busy} onClick={() => onStart(true)}>Start guided example →</button><button className="text-button" disabled={busy} onClick={() => onStart(false)}>Explore without the guide</button></div>
  </dialog>;
}

export default function ExampleGuide({step,loaded,busy,onNavigate,onHide}:{step:number;loaded:boolean;busy:boolean;onNavigate:(tab:string)=>void;onHide:()=>void}) {
  const copy = [
    ['Start with two simple choices.', 'Review the sample water. Choose when unloading must finish and whether vehicles load together or one at a time.', 'Inputs', 'Review the sample'],
    ['Your sample is ready to review.', 'Continue through Vehicles and Water requests, then choose Create delivery plan. You can change the sample details.', 'Inputs', 'Continue setup'],
    ['See where the water will go.', 'Review the stops and unmet requests. Enter a name or team label to approve when you’re ready. Approval does not report a delivery.', 'Plan', 'Review & approve'],
    loaded ? ['Now record a delivery.', 'Choose Delivery made, select the loaded vehicle and its receiving point. Use the example details or enter the total litres delivered so far, then save the report.', 'Operations', 'Record a delivery'] : ['Record loading first.', 'Choose Water loaded, select a vehicle and use its example loading time. Save the report to move its planned water from the depot onto that vehicle.', 'Operations', 'Record loading'],
    ['You’ve completed your first example.', 'You’ve created a plan, approved it and recorded a delivery. Explore resource comparisons, download instructions or keep practising with a breakdown and an updated plan.', 'Compare', 'Compare your options'],
  ][Math.min(step,4)];
  return <section className="example-guide" aria-label="Your example guide">
    <div className="guide-top"><span className="eyebrow">{step===4 ? 'EXAMPLE COMPLETE' : `YOUR GUIDE · STEP ${step+1} OF 4`}</span><button className="text-button" onClick={onHide}>Hide guide</button></div>
    <ol aria-label="Example progress">{exampleSteps.map((label,index) => <li key={label} aria-current={index===step ? 'step' : undefined} className={index<step ? 'done' : index===step ? 'current' : ''}><span aria-hidden="true">{index<step?'✓':index+1}</span>{label}</li>)}</ol>
    <div className="guide-next"><div><h2>{copy[0]}</h2><p>{copy[1]}</p></div><button className="secondary" disabled={busy} onClick={() => onNavigate(copy[2])}>{copy[3]} →</button></div>
  </section>;
}
