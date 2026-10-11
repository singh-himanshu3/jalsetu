import {useEffect,useRef,useState} from 'react';
import App from './App';
import {loadConfig,cloudConfig,localDevelopmentEnabled} from './config';
import {completeSignIn,currentUser,restoreSession,getIdentityToken,signIn,signOut,type User} from './auth';
import {canonicalPath,isWorkspaceRoute,navigate,requestedWorkspaceRoute} from './workspace-route';
import Overview from './Overview';
import SiteFooter from './SiteFooter';
import EmailAccess from './EmailAccess';
import {Droplets,Menu,X} from 'lucide-react';

// StrictMode must not consume a single-use authorization code twice.
let startup:Promise<void>|undefined;
async function initialize(){await loadConfig();if(!cloudConfig())return;const route=await completeSignIn();if(route)navigate(route,true);else await restoreSession();}
export function WorkspaceGate({loading,user,expired,error,onEnter,children,loadingLabel='Restoring your session…'}:{loading:boolean;user:User|null;expired:boolean;error:string;onEnter:()=>void;children:React.ReactNode;loadingLabel?:string}) {
  if(loading)return <main className="signin"><h1>Your planning workspace</h1><p role="status">{loadingLabel}</p></main>;
  if(user&&!expired)return <>{children}</>;
  return <main className="signin"><a href="/">JalSetu home</a><h1>Your planning workspace</h1><p>{expired?'This example workspace has expired.':'Sign in to open your saved projects and delivery records.'}</p>{error&&<p role="alert" className="error">{error}</p>}<EmailAccess disabled={expired} onSignIn={onEnter}/></main>;
}
export default function Startup(){
  const [notice]=useState(()=>{try{return sessionStorage.getItem('jalsetu.auth-notice')??'';}catch{return '';}});
  useEffect(()=>{try{sessionStorage.removeItem('jalsetu.auth-notice');}catch{/* The public page works without browser storage. */}},[]);
  const [loading,setLoading]=useState(true),[user,setUser]=useState<User|null>(null),[error,setError]=useState(''),[path,setPath]=useState(()=>canonicalPath(location.pathname)),[leaving,setLeaving]=useState(false),[signingIn,setSigningIn]=useState(false);
  useEffect(()=>{let active=true;startup??=initialize();startup.then(()=>{if(active){setUser(currentUser());setLoading(false);}}).catch(e=>{if(active){setError((e as Error).message);setLoading(false);if(canonicalPath(location.pathname)==='/auth/callback')navigate('/workspace',true);}});return()=>{active=false;};},[]);
  useEffect(()=>{
    const route=()=>setPath(canonicalPath(location.pathname)),expired=()=>{setUser(null);setError('Your session has ended. Sign in to reopen your workspace.');};
    window.addEventListener('popstate',route);window.addEventListener('jalsetu:navigate',route);window.addEventListener('jalsetu:session-expired',expired);
    const timer=setInterval(()=>{if(currentUser())void getIdentityToken().then(()=>setUser(currentUser())).catch(()=>expired());},30000);
    return()=>{clearInterval(timer);window.removeEventListener('popstate',route);window.removeEventListener('jalsetu:navigate',route);window.removeEventListener('jalsetu:session-expired',expired);};
  },[]);
  const expired=Boolean(cloudConfig()&&Date.parse(cloudConfig()!.expiresAt)<=Date.now());
  const enter=()=>{if(signingIn)return;setError('');if(user&&!expired){navigate('/workspace');return;}setSigningIn(true);void signIn(requestedWorkspaceRoute(path)).catch(e=>{setSigningIn(false);setError((e as Error).message);});};
  // Explicit loopback-only developer mode is separate from authenticated workspace routes.
  if(path==='/local-workspace'&&localDevelopmentEnabled()&&!cloudConfig())return <><div className="cloud-session">Local development · Authentication disabled · Sample data</div><App/></>;
  if(isWorkspaceRoute(path)||path==='/auth/callback')return <WorkspaceGate loading={loading||leaving||signingIn} loadingLabel={leaving?'Signing out of JalSetu…':signingIn?'Opening secure sign-in…':undefined} user={user} expired={expired} error={error} onEnter={enter}>
    {user&&<><div className="account-bar"><a href="/">JalSetu home</a><div className="account-person">{user.picture?<img src={user.picture} alt="" referrerPolicy="no-referrer"/>:<span className="account-avatar" aria-hidden="true">{user.name.slice(0,1)}</span>}<div><strong>{user.email}</strong><span>Coordinator</span></div></div><details><summary>Help & account</summary><div><button onClick={()=>{window.dispatchEvent(new Event('jalsetu:restart-guide'));document.querySelector<HTMLDetailsElement>('.account-bar details')?.removeAttribute('open');}}>Restart guided example</button><button disabled={leaving} onClick={()=>{setLeaving(true);void signOut().catch(()=>{setLeaving(false);setError('You are signed out. Return home and sign in again to try again.');navigate('/',true);});}}>Sign out</button></div></details></div><App key={user.sub} cloud onboardingScope={`${cloudConfig()!.issuer}:${cloudConfig()!.clientId}:${user.sub}`}/></>}
  </WorkspaceGate>;
  return <PublicLanding expired={expired} error={error} notice={notice} onEnter={()=>navigate('/workspace')} loading={loading||signingIn} signedIn={Boolean(user)}/>;
}

export function PublicLanding({expired,error,onEnter,loading=false,signedIn=false,notice=''}:{expired:boolean;error:string;onEnter:()=>void;loading?:boolean;signedIn?:boolean;notice?:string}) {
  const [menuOpen,setMenuOpen]=useState(false),button=useRef<HTMLButtonElement>(null);
  const close=()=>{setMenuOpen(false);button.current?.focus();};
  useEffect(()=>{if(!menuOpen)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')close();};window.addEventListener('keydown',escape);const media=window.matchMedia('(min-width: 901px)'),resize=()=>{if(media.matches)close();};media.addEventListener('change',resize);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',escape);media.removeEventListener('change',resize);};},[menuOpen]);
  return <div className="public-home">
    <a className="skip-link" href="#workspace">Skip to main content</a>
    <header className="public-header"><a className="brand" href="#workspace"><span className="mark"><Droplets aria-hidden="true"/></span><span>JalSetu<small>WATER RELIEF WORKSPACE</small></span></a><button ref={button} className="mobile-menu-toggle" type="button" aria-label={menuOpen?'Close navigation':'Open navigation'} aria-expanded={menuOpen} aria-controls="landing-navigation" onClick={()=>menuOpen?close():setMenuOpen(true)}>{menuOpen?<X size={22}/>:<Menu size={22}/>}</button><nav id="landing-navigation" className={menuOpen?'is-open':''} aria-label="About JalSetu" onClick={close}><a href="#services">What we do</a><a href="#how-it-works">How it works</a><a href="#questions">Questions</a></nav><a className="repo-link" href="https://github.com/singh-himanshu3/jalsetu" target="_blank" rel="noreferrer">View on GitHub ↗</a><button className="secondary public-signin" disabled={expired||loading} onClick={onEnter}>{signedIn?'Open workspace':'Sign in'}</button></header>
    <main id="workspace" tabIndex={-1}>
      {loading&&<p className="public-access-note" role="status">Checking sign-in availability…</p>}
      {notice&&<p className="public-access-note" role="status">{notice}</p>}
      {expired&&<div className="public-access-note"><strong>This example workspace has expired.</strong><span>The introduction remains available; planning and saved records are closed.</span></div>}
      {error&&<p role="alert" className="error">{error}</p>}
      <Overview publicView input={null} busy={expired||loading} hasPlan={false} onLoad={onEnter} onNavigate={onEnter}/><SiteFooter/>
    </main>
  </div>;
}
