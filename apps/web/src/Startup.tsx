import {useEffect,useState} from 'react';
import App from './App';
import {loadConfig,cloudConfig} from './config';
import {completeSignIn,idToken,signIn,signOut} from './auth';
import {api} from './api';
import Overview from './Overview';
import { Droplets, ArrowRight } from 'lucide-react';

// One shared promise also prevents duplicate code exchanges under React StrictMode.
let startup:Promise<boolean>|undefined;
async function initialize() {await loadConfig();await completeSignIn();if(!cloudConfig())return true;if(!idToken())return false;await api('/v1/health');return true;}
export default function Startup() {
  const[ready,setReady]=useState<boolean|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;startup??=initialize();startup.then(value=>{if(active)setReady(value);}).catch(e=>{if(active){setError((e as Error).message);setReady(false);}});return()=>{active=false;};},[]);
  if(ready&&cloudConfig())return <><div className="cloud-session">AWS live · Mumbai · EXAMPLE DATA <button onClick={signOut}>Sign out</button></div><App cloud/></>;
  if(ready)return <App/>;
  if(ready===false&&cloudConfig()) {
    const expired=Date.parse(cloudConfig()!.expiresAt)<=Date.now();
    const enter=()=>{if(!expired)void signIn().catch(e=>setError((e as Error).message));};
    return <PublicLanding expired={expired} error={error} onEnter={enter}/>;
  }
  return <main className="signin"><h1>JalSetu · example workspace</h1>{ready===null?<p role="status">Checking deployment and sign-in…</p>:<><p>Sign in to save your own synthetic planning exercises. This hosted version uses labelled examples only.</p>{error&&<p role="alert" className="error">{error}</p>}{cloudConfig()&&<button className="primary" onClick={()=>signIn().catch(e=>setError((e as Error).message))}>Sign in</button>}</>}</main>;
}

// The introduction is also rendered by the isolated UI-review harness.
export function PublicLanding({expired,error,onEnter}:{expired:boolean;error:string;onEnter:()=>void}) {
  return <div className="public-home">
      <a className="skip-link" href="#workspace">Skip to main content</a>
      <header className="public-header"><a className="brand" href="#workspace"><span className="mark"><Droplets aria-hidden="true"/></span><span>JalSetu<small>WATER RELIEF WORKSPACE</small></span></a><nav aria-label="About JalSetu"><a href="#services">What we do</a><a href="#how-it-works">How it works</a><a href="#questions">Questions</a></nav><a className="repo-link" href="https://github.com/singh-himanshu3/jalsetu" target="_blank" rel="noreferrer">View on GitHub ↗</a><button className="secondary" disabled={expired} onClick={onEnter}>Sign in <ArrowRight size={16}/></button></header>
      <main id="workspace" tabIndex={-1}>
        {expired&&<div className="public-access-note"><strong>This example workspace has expired.</strong><span>The introduction remains available; planning and saved records are closed.</span></div>}
        {error&&<p role="alert" className="error">{error}</p>}
        <Overview publicView input={null} busy={expired} hasPlan={false} onLoad={onEnter} onNavigate={onEnter}/>
        <footer><span className="footer-brand">JalSetu</span><span>Water relief planning · Labelled Delhi example</span><a href="https://github.com/singh-himanshu3/jalsetu" target="_blank" rel="noreferrer">Explore the source ↗</a></footer>
      </main>
    </div>;
}
