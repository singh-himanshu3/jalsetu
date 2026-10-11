import { Droplets } from 'lucide-react';

export default function SiteFooter({onNavigate,cloud=false}:{onNavigate?:(tab:string)=>void;cloud?:boolean}) {
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-about"><span className="footer-brand"><Droplets size={25} aria-hidden="true"/>JalSetu</span><p>Water delivery planning, route review and delivery reporting in one workspace.</p></div>
      <nav className="footer-nav" aria-label={onNavigate?'Workspace footer':'Explore JalSetu'}><strong>{onNavigate?'Workspace':'Explore JalSetu'}</strong>{onNavigate?<><button onClick={()=>onNavigate('Inputs')}>Set up a run</button><button onClick={()=>onNavigate('Plan')}>Review your plan</button><button onClick={()=>onNavigate('Operations')}>Deliveries</button></>:<><a href="#services">What we do</a><a href="#how-it-works">How it works</a><a href="#questions">Questions</a></>}</nav>
      <div className="footer-project"><strong>Project</strong><a href="https://github.com/singh-himanshu3/jalsetu" target="_blank" rel="noopener noreferrer">View source on GitHub <span aria-hidden="true">↗</span></a><span>Plans are estimates. Deliveries are recorded separately.</span></div>
    </div>
    <div className="footer-bottom"><span>{onNavigate?cloud?'Hosted example workspace':'Local workspace':'Labelled Delhi example'}</span><span>No vehicles are dispatched by JalSetu.</span></div>
  </footer>;
}
