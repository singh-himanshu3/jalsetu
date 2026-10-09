import {useEffect,useState} from 'react';
import App from './App';
import {loadConfig,cloudConfig} from './config';
import {completeSignIn,idToken,signIn,signOut} from './auth';
import {api} from './api';

// One shared promise also prevents duplicate code exchanges under React StrictMode.
let startup:Promise<boolean>|undefined;
async function initialize() {await loadConfig();await completeSignIn();if(!cloudConfig())return true;if(!idToken())return false;await api('/v1/health');return true;}
export default function Startup() {
  const[ready,setReady]=useState<boolean|null>(null),[error,setError]=useState('');
  useEffect(()=>{let active=true;startup??=initialize();startup.then(value=>{if(active)setReady(value);}).catch(e=>{if(active){setError((e as Error).message);setReady(false);}});return()=>{active=false;};},[]);
  if(ready&&cloudConfig())return <><div className="cloud-session">AWS live · Mumbai · EXAMPLE DATA <button onClick={signOut}>Sign out</button></div><App cloud/></>;
  if(ready)return <App/>;
  return <main className="signin"><h1>JalSetu · example workspace</h1>{ready===null?<p role="status">Checking deployment and sign-in…</p>:<><p>Sign in to save your own synthetic planning exercises. This hosted version uses labelled examples only.</p>{error&&<p role="alert" className="error">{error}</p>}{cloudConfig()&&<button className="primary" onClick={()=>signIn().catch(e=>setError((e as Error).message))}>Sign in</button>}</>}</main>;
}
