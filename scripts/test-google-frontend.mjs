import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {webcrypto} from 'node:crypto';
import {readFile} from 'node:fs/promises';
const web=resolve(import.meta.dirname,'../apps/web'),require=createRequire(resolve(web,'package.json'));
const {JSDOM}=await import(pathToFileURL(require.resolve('jsdom')).href);
const {createServer}=await import(pathToFileURL(require.resolve('vite')).href);
const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost:5173/',pretendToBeVisual:true});
for(const name of ['window','document','sessionStorage','localStorage','HTMLElement','HTMLDivElement','HTMLDetailsElement','Element','SVGElement','MouseEvent','KeyboardEvent','Event','MutationObserver','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,name,{value:typeof dom.window[name]==='function'&&['getComputedStyle','requestAnimationFrame','cancelAnimationFrame'].includes(name)?dom.window[name].bind(dom.window):dom.window[name],configurable:true,writable:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let reduced=true;const mediaListeners=new Set();
window.matchMedia=query=>({matches:query.includes('prefers-reduced-motion')?reduced:false,media:query,addEventListener:(_name,fn)=>mediaListeners.add(fn),removeEventListener:(_name,fn)=>mediaListeners.delete(fn),addListener:fn=>mediaListeners.add(fn),removeListener:fn=>mediaListeners.delete(fn)});
window.scrollTo=()=>{};HTMLElement.prototype.scrollIntoView=function(){this.dataset.scrolled='true';};
globalThis.IntersectionObserver=class{constructor(){throw new Error('Unavailable observer');}};
const server=await createServer({root:web,server:{middlewareMode:true},appType:'custom'});
let root;
try{
  let assigned='',path='/',search='';
  globalThis.location={origin:'http://localhost:5173',hostname:'localhost',get pathname(){return path;},get search(){return search;},assign:url=>assigned=url};
  globalThis.history={replaceState:(_a,_b,url)=>{const u=new URL(url,location.origin);path=u.pathname;search=u.search;}};
  const config={mode:'aws_live',authProvider:'GoogleAndEmail',region:'ap-south-1',apiBaseUrl:'https://example123.execute-api.ap-south-1.amazonaws.com/prod',clientId:'testclient',loginBaseUrl:'https://jalsetu-test.auth.ap-south-1.amazoncognito.com',issuer:'https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_test',redirectUri:'http://localhost:5173/auth/callback',logoutUri:'http://localhost:5173/',expiresAt:'2099-01-01T00:00:00Z'};
  const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
  const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'testkey',alg:'RS256',use:'sig'};
  const encode=value=>Buffer.from(typeof value==='string'?value:JSON.stringify(value)).toString('base64url');
  let nonce='',tokenResponse,tokenCalls=0,emailCalls=[],emailFailure=null;
  const jwt=async(changes={})=>{const value={iss:config.issuer,aud:config.clientId,sub:'11111111-1111-4111-8111-111111111111',token_use:'id',exp:Math.floor(Date.now()/1000)+3600,nonce,name:'Sample coordinator',email:'coordinator@workspace.example',email_verified:true,picture:'https://lh3.googleusercontent.com/sample',identities:JSON.stringify([{providerName:'Google'}]),...changes};const body=`${encode({alg:'RS256',kid:'testkey'})}.${encode(value)}`;return body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body))).toString('base64url');};
  globalThis.fetch=async(url,options)=>{
    if(String(url)==='/config.json')return Response.json(config);
    if(String(url).endsWith('/jwks.json'))return Response.json({keys:[jwk]});
    if(String(url).endsWith('/oauth2/token')){tokenCalls++;assert.equal(options.method,'POST');if(options.body.get('grant_type')==='authorization_code')assert.equal(options.body.get('redirect_uri'),config.redirectUri,'Token exchange keeps the exact registered callback despite the host slash redirect');return typeof tokenResponse==='function'?await tokenResponse(options):Response.json(tokenResponse);}
    if(String(url).endsWith('/oauth2/revoke'))return new Response('',{status:200});
    if(String(url)===new URL(config.issuer).origin){assert.equal(options.method,'POST');emailCalls.push({action:options.headers['X-Amz-Target'],body:JSON.parse(options.body)});return emailFailure?Response.json({__type:emailFailure},{status:400}):Response.json({});}
    throw new Error('Unexpected request '+url);
  };
  const authFetch=globalThis.fetch;
  const cfg=await server.ssrLoadModule('/src/config.ts'),auth=await server.ssrLoadModule('/src/auth.ts'),routes=await server.ssrLoadModule('/src/workspace-route.ts');await cfg.loadConfig();
  assert.equal(cfg.localDevelopmentEnabled(),false,'Missing auth must not silently grant local workspace access');
  assert.equal(routes.isWorkspaceRoute('/workspace/deliveries'),true);assert.equal(routes.isWorkspaceRoute('/'),false);
  assert.equal(routes.requestedWorkspaceRoute('https://attacker.example/'),'/workspace');
  assert.throws(()=>cfg.validateConfig({...config,redirectUri:'https://attacker.example/auth/callback'}));
  assert.throws(()=>cfg.validateConfig({...config,clientSecret:'never-publish'}));
  async function start(returnRoute='/workspace/deliveries'){path='/';search='';await auth.signIn(returnRoute,'Google');const u=new URL(assigned);nonce=u.searchParams.get('nonce');const transaction=JSON.parse(sessionStorage.getItem('jalsetu.google-transaction'));assert.equal(u.searchParams.get('identity_provider'),'Google');assert.equal(u.searchParams.get('response_type'),'code');assert.equal(u.searchParams.get('code_challenge_method'),'S256');assert.equal(u.searchParams.get('scope'),'openid email profile');assert.equal(u.searchParams.get('code_challenge'),Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(transaction.verifier))).toString('base64url'));path='/auth/callback';search='?code=synthetic-code&state='+transaction.state;return transaction;}
  await start();tokenResponse={id_token:await jwt(),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};
  assert.equal(await auth.completeSignIn(),'/workspace/deliveries');assert.equal(search,'','Callback code must be removed before token exchange');assert.ok(auth.idToken());assert.equal(auth.currentUser().email,'coordinator@workspace.example','Workspace addresses are accepted, without a Gmail-only restriction');
  assert.equal(await auth.restoreSession(),true,'Reload verifies and restores the stored runtime session');
  assert.equal(routes.workspaceTab('/workspace/deliveries'),'Operations');assert.equal(routes.isWorkspaceRoute('/dashboard'),true);
  await assert.rejects(()=>auth.completeSignIn(),/verified/,'Callback transaction cannot be replayed');assert.equal(auth.currentUser(),null);
  const cancelled=await start();search='?error=access_denied&state='+cancelled.state;await assert.rejects(()=>auth.completeSignIn(),/cancelled/);assert.equal(auth.idToken(),null);
  await start();search+='wrong';const before=tokenCalls;await assert.rejects(()=>auth.completeSignIn(),/verified/);assert.equal(tokenCalls,before,'Bad state must not exchange an authorization code');
  for(const change of [{nonce:'wrong'},{aud:'otherclient'},{iss:'https://attacker.example'},{identities:'[{"providerName":"COGNITO"}]'},{email_verified:false}]){await start();tokenResponse={id_token:await jwt(change),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await assert.rejects(()=>auth.completeSignIn());assert.equal(auth.idToken(),null);}
  await start();const signed=await jwt();tokenResponse={id_token:signed.slice(0,signed.lastIndexOf('.')+1)+encode('invalid signature'),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await assert.rejects(()=>auth.completeSignIn(),/signature/);
  await start();tokenResponse={id_token:await jwt(),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await auth.completeSignIn();
  const stored=JSON.parse(sessionStorage.getItem('jalsetu.google-session'));stored.idToken=await jwt({exp:Math.floor(Date.now()/1000)-60});sessionStorage.setItem('jalsetu.google-session',JSON.stringify(stored));
  tokenResponse={id_token:await jwt({nonce:undefined}),access_token:'synthetic-access'};assert.equal(await auth.restoreSession(),true,'Refresh verifies the same subject; refreshed OIDC tokens may omit nonce');
  const refreshed=JSON.parse(sessionStorage.getItem('jalsetu.google-session'));refreshed.idToken=await jwt({exp:Math.floor(Date.now()/1000)-60});sessionStorage.setItem('jalsetu.google-session',JSON.stringify(refreshed));tokenResponse={id_token:await jwt({sub:'different-user'}),access_token:'synthetic-access'};await assert.rejects(()=>auth.restoreSession(),/no longer active/);assert.equal(auth.currentUser(),null);
  await start();tokenResponse={id_token:await jwt(),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await auth.completeSignIn();await auth.signOut();assert.equal(auth.idToken(),null);assert.equal(sessionStorage.getItem('jalsetu.google-session'),null);assert.equal(new URL(assigned).pathname,'/logout');assert.equal(new URL(assigned).searchParams.get('logout_uri'),config.logoutUri);
  await start();tokenResponse={id_token:await jwt(),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await auth.completeSignIn();const racing=JSON.parse(sessionStorage.getItem('jalsetu.google-session'));racing.idToken=await jwt({exp:Math.floor(Date.now()/1000)-60});sessionStorage.setItem('jalsetu.google-session',JSON.stringify(racing));let release,started;const began=new Promise(resolve=>started=resolve);tokenResponse=()=>new Promise(resolve=>{release=resolve;started();});const restore=auth.restoreSession();await began;auth.clearSession();release(Response.json({id_token:await jwt(),access_token:'synthetic-access'}));await assert.rejects(()=>restore);assert.equal(auth.currentUser(),null,'An in-flight refresh cannot undo logout');
  console.log('Google auth checks passed: PKCE, safe return route, callback/cancellation/replay, signed claims, Workspace email, restoration/refresh/subject binding and logout race.');

  async function startEmail(){path='/workspace/deliveries';search='';await auth.signIn(undefined,'Account','member@organization.example');const u=new URL(assigned);assert.equal(u.searchParams.has('identity_provider'),false,'Email entry opens Cognito sign-in instead of forcing Google');assert.equal(u.searchParams.get('login_hint'),'member@organization.example');assert.equal(u.searchParams.get('code_challenge_method'),'S256');nonce=u.searchParams.get('nonce');const t=JSON.parse(sessionStorage.getItem('jalsetu.google-transaction'));path='/auth/callback';search='?code=synthetic-code&state='+t.state;return t;}
  await startEmail();tokenResponse={id_token:await jwt({identities:undefined,picture:undefined}),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};assert.equal(await auth.completeSignIn(),'/workspace/deliveries');assert.equal(auth.currentUser().picture,null);assert.equal(await auth.restoreSession(),true);
  const nativeSession=JSON.parse(sessionStorage.getItem('jalsetu.google-session'));nativeSession.idToken=await jwt({identities:undefined,exp:Math.floor(Date.now()/1000)-60});sessionStorage.setItem('jalsetu.google-session',JSON.stringify(nativeSession));tokenResponse={id_token:await jwt({identities:undefined,nonce:undefined}),access_token:'synthetic-access'};assert.equal(await auth.restoreSession(),true,'Verified native accounts refresh with the same PKCE/OIDC safeguards');
  for(const change of [{identities:undefined,email_verified:false},{identities:'[{"providerName":"Facebook"}]'},{identities:'{}'}]){await startEmail();tokenResponse={id_token:await jwt(change),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await assert.rejects(()=>auth.completeSignIn());assert.equal(auth.currentUser(),null);}
  await start();tokenResponse={id_token:await jwt({identities:undefined}),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await assert.rejects(()=>auth.completeSignIn(),'Direct Google transactions must not accept a native identity');
  await auth.createEmailAccount(' member@organization.example ','SyntheticPassword9!');assert.deepEqual(emailCalls.at(-1),{action:'AWSCognitoIdentityProviderService.SignUp',body:{ClientId:'testclient',Username:'member@organization.example',Password:'SyntheticPassword9!',UserAttributes:[{Name:'email',Value:'member@organization.example'}]}});
  assert.ok(![...Array(sessionStorage.length)].map((_,i)=>sessionStorage.getItem(sessionStorage.key(i))).join().includes('SyntheticPassword9!'),'Passwords never enter browser storage');
  await auth.confirmEmailAccount('member@organization.example','123456');assert.equal(emailCalls.at(-1).body.ConfirmationCode,'123456');await auth.resendEmailCode('member@organization.example');assert.ok(emailCalls.at(-1).action.endsWith('.ResendConfirmationCode'));
  emailFailure='CodeMismatchException';await assert.rejects(()=>auth.confirmEmailAccount('member@organization.example','000000'),/does not match/);emailFailure=null;
  config.authProvider='Google';await cfg.loadConfig();await assert.rejects(()=>auth.signIn(undefined,'Account'),/not been enabled/);await assert.rejects(()=>auth.createEmailAccount('member@organization.example','SyntheticPassword9!'),/not been enabled/);config.authProvider='GoogleAndEmail';await cfg.loadConfig();
  console.log('Email auth checks passed: verified native identity, refresh, provider rejection, signup/confirmation/resend, safe errors, disabled legacy configuration and password-storage boundary.');
  config.authProvider='Email';await cfg.loadConfig();await assert.rejects(()=>auth.signIn(undefined,'Google'),/Google sign-in has not been enabled/);await startEmail();tokenResponse={id_token:await jwt({identities:undefined}),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await auth.completeSignIn();assert.ok(auth.currentUser());await startEmail();tokenResponse={id_token:await jwt(),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};await assert.rejects(()=>auth.completeSignIn());config.authProvider='Email';await cfg.loadConfig();

  assert.equal(routes.canonicalPath('/auth/callback/'),'/auth/callback');
  assert.equal(routes.requestedWorkspaceRoute('/workspace/deliveries/'),'/workspace/deliveries');
  assert.equal(routes.workspaceTab('/workspace/deliveries/'),'Operations');
  assert.equal(routes.requestedWorkspaceRoute('https://attacker.example/'),'/workspace');
  await startEmail();path='/auth/callback/';tokenResponse={id_token:await jwt({identities:undefined}),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};
  assert.equal(await auth.completeSignIn(),'/workspace/deliveries','Amplify trailing-slash callback must complete the native login');
  assert.equal(path,'/auth/callback');assert.equal(search,'');assert.ok(auth.currentUser());
  await startEmail();path='/auth/callback-other/';assert.equal(await auth.completeSignIn(),null,'Only the exact callback route is accepted');auth.clearSession();
  console.log('Amplify callback regressions passed: trailing slash, safe return route, code cleanup and unrelated-path refusal.');
  globalThis.location=window.location;globalThis.history=window.history;
  const React=await import(pathToFileURL(require.resolve('react')).href),{createRoot}=await import(pathToFileURL(require.resolve('react-dom/client')).href),{act}=React;
  const motion=await server.ssrLoadModule('motion/react'),{PublicLanding,WorkspaceGate}=await server.ssrLoadModule('/src/Startup.tsx'),{ExampleWelcome}=await server.ssrLoadModule('/src/ExampleGuide.tsx'),{Reveal}=await server.ssrLoadModule('/src/Motion.tsx'),onboarding=await server.ssrLoadModule('/src/onboarding.ts');
  root=createRoot(document.getElementById('root'));let signins=0;
  const wrap=element=>React.createElement(motion.LazyMotion,{features:motion.domAnimation,strict:true},React.createElement(motion.MotionConfig,{reducedMotion:'user'},element));
  const render=async element=>{await act(async()=>root.render(wrap(element)));};
  const click=async element=>{assert.ok(element);await act(async()=>element.dispatchEvent(new MouseEvent('click',{bubbles:true})));};
  await render(React.createElement(WorkspaceGate,{loading:false,user:null,expired:false,error:'',onEnter:()=>signins++},React.createElement('div',null,'Private records')));assert.ok(!document.body.textContent.includes('Private records'));assert.ok(!document.body.textContent.includes('Google'));await click(document.querySelector('button'));assert.equal(signins,1);
  await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Create an account'));assert.ok(document.querySelector('input[type="email"]'));assert.equal(document.querySelector('input[type="password"]').getAttribute('autocomplete'),'new-password');assert.ok(!document.querySelector('input[type="tel"]'));await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Already have a verification code?'));assert.equal(document.querySelector('input[autocomplete="one-time-code"]').getAttribute('inputmode'),'numeric');await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Back to sign-in options'));assert.equal(document.querySelector('input[type="password"]'),null);assert.ok(document.body.textContent.includes('Forgot your password?'));
  await render(React.createElement(PublicLanding,{expired:false,error:'',onEnter:()=>signins++}));
  const menu=document.querySelector('.mobile-menu-toggle');await click(menu);assert.equal(document.body.style.overflow,'hidden');await act(async()=>window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));assert.equal(menu.getAttribute('aria-expanded'),'false');assert.equal(document.body.style.overflow,'');assert.equal(document.activeElement,menu);
  await click(menu);await click(document.querySelector('a[href="#services"]'));assert.equal(document.body.style.overflow,'');assert.equal(document.activeElement,menu);
  await click([...document.querySelectorAll('button')].find(e=>e.textContent.includes('Explore delivery changes')));assert.equal(signins,1,'Exploring disruption does not initiate authentication');assert.equal(document.getElementById('disruption').dataset.scrolled,'true');assert.ok(document.querySelector('.disruption-highlight'));
  await click(document.querySelector('[aria-label="Preview Receiving point 3"]'));assert.equal(document.querySelector('[aria-label="Preview Receiving point 3"]').getAttribute('aria-pressed'),'true');assert.ok(document.querySelector('.preview-stop-card').textContent.includes('Receiving point 3'));await click([...document.querySelectorAll('.preview-stages button')].find(e=>e.textContent.includes('Report')));assert.equal(document.querySelector('.preview-phase').textContent,'Reported');assert.equal(document.querySelector('.preview-disclosure').textContent,'Sample workflow · Illustrative plan · No vehicles dispatched');
  await render(React.createElement(Reveal,null,'Visible content'));assert.equal(document.getElementById('root').firstChild.style.opacity,'1');assert.ok(!document.getElementById('root').firstChild.style.transform||document.getElementById('root').firstChild.style.transform==='none');
  reduced=false;await act(async()=>{for(const listener of mediaListeners)listener({matches:false});});await render(React.createElement(Reveal,null,'Observer failure content'));assert.notEqual(document.getElementById('root').firstChild.style.opacity,'0','Observer failures leave content visible');
  let guided;await render(React.createElement(ExampleWelcome,{busy:false,onStart:value=>{guided=value;onboarding.completeOnboarding('sample-user');},onClose:()=>{}}));assert.ok(document.querySelector('section.example-welcome'));assert.equal(document.querySelector('dialog'),null);assert.equal(onboarding.onboardingCompleted('sample-user'),false);await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Start guided example'));assert.equal(guided,true);assert.equal(onboarding.onboardingCompleted('sample-user'),true);assert.equal(onboarding.onboardingCompleted('other-user'),false,'Onboarding memory must be account-scoped');
  console.log('Frontend DOM checks passed: protected gate, public preview, mobile scroll lock/link/Escape/focus, disruption action, selected stop/status, reduced motion/observer failure and compact account-scoped onboarding.');
  const input=JSON.parse(await readFile(resolve(web,'../../data/evaluation/finish_by_close_parallel/north_delhi_example.json'),'utf8'));
  globalThis.fetch=async url=>{if(String(url)==='/config.json')return new Response('',{status:404});if(String(url)==='/v1/example')return Response.json(input);if(String(url)==='/v1/projects')return Response.json({projects:[]});throw new Error('Unexpected local test request '+url);};await cfg.loadConfig();
  const {default:App}=await server.ssrLoadModule('/src/App.tsx');
  await render(React.createElement(App,{key:'returning',onboardingScope:'sample-user'}));assert.equal(document.querySelector('.example-welcome'),null,'Returning users bypass onboarding');
  await render(React.createElement(App,{key:'first',onboardingScope:'new-account'}));assert.ok(document.querySelector('.example-welcome'));await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Start guided example'));assert.equal(document.querySelector('.example-welcome'),null);assert.ok(document.querySelector('.example-guide'));assert.equal(onboarding.onboardingCompleted('new-account'),true);
  await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Leave guide'));assert.equal(document.querySelector('.example-guide'),null);await act(async()=>window.dispatchEvent(new Event('jalsetu:restart-guide')));assert.ok(document.querySelector('.example-welcome'));await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Explore on my own'));assert.equal(document.querySelector('.example-guide'),null);
  await render(React.createElement(App,{key:'failed',onboardingScope:'failed-load'}));globalThis.fetch=async()=>new Response('',{status:503});await click([...document.querySelectorAll('button')].find(e=>e.textContent==='Start guided example'));assert.ok(document.querySelector('.example-welcome'));assert.equal(onboarding.onboardingCompleted('failed-load'),false,'A failed sample load must not mark onboarding complete');
  await render(React.createElement(WorkspaceGate,{loading:true,user:null,expired:false,error:'',onEnter:()=>{}},React.createElement('div',null,'Private records')));assert.ok(document.querySelector('[role="status"]'));assert.ok(!document.body.textContent.includes('Private records'));
  await render(React.createElement(WorkspaceGate,{loading:false,user:{sub:'sample'},expired:true,error:'',onEnter:()=>{}},React.createElement('div',null,'Private records')));assert.ok(!document.body.textContent.includes('Private records'));assert.equal(document.querySelector('button').disabled,true);
  console.log('Workspace onboarding checks passed: first visit, successful sample load, returning visit, leave/restart, independent exploration, failed-load persistence and loading gate.');
  // Exercise the actual application startup, not just the isolated token helper.
  globalThis.location={origin:'http://localhost:5173',hostname:'localhost',get pathname(){return path;},get search(){return search;},assign:url=>assigned=url};
  globalThis.history={replaceState:(_a,_b,url)=>{const u=new URL(url,location.origin);path=u.pathname;search=u.search;}};
  globalThis.fetch=authFetch;await cfg.loadConfig();const hostedTransaction=await startEmail();
  tokenResponse={id_token:await jwt({identities:undefined}),access_token:'synthetic-access',refresh_token:'synthetic-refresh'};
  window.history.replaceState(null,'','/auth/callback/?code=synthetic-code&state='+hostedTransaction.state);
  globalThis.location=window.location;globalThis.history=window.history;
  globalThis.fetch=async(url,options)=>String(url)===config.apiBaseUrl+'/v1/projects'?Response.json({projects:[]}):authFetch(url,options);
  const {default:Startup}=await server.ssrLoadModule('/src/Startup.tsx');
  await render(React.createElement(React.StrictMode,null,React.createElement(Startup)));
  for(let attempt=0;attempt<50&&!document.querySelector('.account-bar');attempt++)await act(async()=>{await new Promise(resolve=>setTimeout(resolve,5));});
  assert.ok(document.querySelector('.account-bar'),'The hosted trailing-slash callback mounts the authenticated workspace');
  assert.ok(document.querySelector('.example-welcome'),'A newly signed-in coordinator sees onboarding');
  assert.equal(location.pathname,'/workspace/deliveries');assert.equal(location.search,'');assert.equal(document.querySelector('.public-home'),null);
  console.log('Full startup regression passed: Amplify callback redirect, StrictMode, token exchange, authenticated workspace and first-use onboarding.');

}finally{if(root){const React=await import(pathToFileURL(require.resolve('react')).href);await React.act(async()=>root.unmount());}await server.close();dom.window.close();}
