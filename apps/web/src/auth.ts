import {cloudConfig,type CloudConfig} from './config';
import {canonicalPath,requestedWorkspaceRoute} from './workspace-route';

const SESSION='jalsetu.google-session',TRANSACTION='jalsetu.google-transaction';
type Claims={sub:string;exp:number;iss:string;aud:string;token_use:string;nonce?:string;name?:string;email?:string;email_verified?:boolean|string;picture?:string;identities?:string|{providerName:string}[]};
type AuthMethod='Google'|'Account';
type Session={idToken:string;accessToken:string;refreshToken:string;nonce:string;binding:string;method?:AuthMethod};
export type User={sub:string;name:string;email:string;picture:string|null};
let session:Session|null=null,claims:Claims|null=null,refreshing:Promise<string|null>|null=null,generation=0;
const keys=new Map<string,JsonWebKey[]>();
const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const decode=(text:string)=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
const json=(text:string)=>JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(text)));
const binding=(c:CloudConfig)=>`${c.issuer}:${c.clientId}`;
const config=()=>{const c=cloudConfig();if(!c)throw new Error('Sign-in is not configured.');return c;};
export function clearSession(){generation++;session=null;claims=null;refreshing=null;sessionStorage.removeItem(SESSION);sessionStorage.removeItem(TRANSACTION);for(const k of ['jalsetu.id-token','jalsetu.oauth-state','jalsetu.pkce-verifier'])sessionStorage.removeItem(k);}
export function sessionExpired(){clearSession();window.dispatchEvent(new Event('jalsetu:session-expired'));}
export function idToken(){return session&&claims&&claims.exp*1000>Date.now()+30000?session.idToken:null;}
export function currentUser():User|null {
  if(!claims||!session)return null;let picture:string|null=null;
  try{const u=new URL(claims.picture??'');if(u.protocol==='https:'&&!u.username&&!u.password&&(u.hostname==='googleusercontent.com'||u.hostname.endsWith('.googleusercontent.com')))picture=u.href;}catch{/* Use initials if Google provides no usable picture. */}
  return {sub:claims.sub,name:claims.name||claims.email||'JalSetu account',email:claims.email??'',picture};
}
async function verify(token:string,nonce:string,c:CloudConfig,allowExpired=false,refresh=false,method:AuthMethod='Account'):Promise<Claims> {
  const parts=token.split('.');if(parts.length!==3)throw new Error('The identity token is invalid.');
  const header=json(parts[0]),value=json(parts[1]) as Claims;
  if(header.alg!=='RS256'||typeof header.kid!=='string'||value.iss!==c.issuer||value.aud!==c.clientId||value.token_use!=='id'||typeof value.sub!=='string'||!value.sub||!Number.isFinite(value.exp)||(!allowExpired&&value.exp*1000<=Date.now()+30000)||(refresh?value.nonce!==undefined&&value.nonce!==nonce:value.nonce!==nonce))throw new Error('The sign-in session could not be verified.');
  const identities=typeof value.identities==='string'?JSON.parse(value.identities):value.identities;
  const google=Array.isArray(identities)&&identities.length>0&&identities.every(i=>i.providerName==='Google');
  const native=value.identities===undefined||Array.isArray(identities)&&identities.length===0;
  if(!(google&&c.authProvider!=='Email'||method==='Account'&&c.authProvider!=='Google'&&native)||!value.email||![true,'true'].includes(value.email_verified??false))throw new Error('Use a verified account to continue.');
  if(!keys.has(c.issuer))await fetchKeys(c);
  let key=keys.get(c.issuer)?.find(k=>(k as JsonWebKey&{kid?:string}).kid===header.kid);
  if(!key){await fetchKeys(c);key=keys.get(c.issuer)?.find(k=>(k as JsonWebKey&{kid?:string}).kid===header.kid);}
  if(!key||key.kty!=='RSA')throw new Error('The identity signing key is unavailable.');
  const imported=await crypto.subtle.importKey('jwk',key,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',imported,decode(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`)))throw new Error('The identity signature is invalid.');return value;
}
async function fetchKeys(c:CloudConfig){const r=await fetch(`${c.issuer}/.well-known/jwks.json`,{signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Could not verify this session. Try again.');const v=await r.json();if(!Array.isArray(v.keys))throw new Error('Identity signing keys are invalid.');keys.set(c.issuer,v.keys);}
async function exchange(body:URLSearchParams,c:CloudConfig){const r=await fetch(new URL('/oauth2/token',c.loginBaseUrl),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Your session expired or sign-in failed. Please sign in again.');return r.json();}
async function accept(tokens:Record<string,unknown>,nonce:string,c:CloudConfig,epoch:number,previousRefresh?:string,subject?:string,method:AuthMethod='Account'){
  if(typeof tokens.id_token!=='string'||typeof tokens.access_token!=='string'||!(typeof tokens.refresh_token==='string'||previousRefresh))throw new Error('Sign-in did not return a complete session.');
  const next=await verify(tokens.id_token,nonce,c,false,Boolean(previousRefresh),method);
  if(generation!==epoch||subject&&next.sub!==subject)throw new Error('This sign-in session is no longer active.');
  session={idToken:tokens.id_token,accessToken:tokens.access_token,refreshToken:typeof tokens.refresh_token==='string'?tokens.refresh_token:previousRefresh!,nonce,binding:binding(c),method};claims=next;sessionStorage.setItem(SESSION,JSON.stringify(session));
}
export async function signIn(returnRoute=requestedWorkspaceRoute(location.pathname),method:AuthMethod='Account',email?:string) {
  const c=config();if(Date.parse(c.expiresAt)<=Date.now())throw new Error('This example workspace has expired.');clearSession();
  if(method==='Account'&&c.authProvider==='Google')throw new Error('Email sign-in has not been enabled yet.');
  if(method==='Google'&&c.authProvider==='Email')throw new Error('Google sign-in has not been enabled yet. Use email sign-in.');
  const verifier=base64url(crypto.getRandomValues(new Uint8Array(48))),state=base64url(crypto.getRandomValues(new Uint8Array(32))),nonce=base64url(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem(TRANSACTION,JSON.stringify({verifier,state,nonce,method,returnRoute:requestedWorkspaceRoute(returnRoute),createdAt:Date.now(),binding:binding(c)}));
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const u=new URL('/oauth2/authorize',c.loginBaseUrl);u.search=new URLSearchParams({client_id:c.clientId,response_type:'code',scope:'openid email profile',redirect_uri:c.redirectUri,state,nonce,code_challenge:challenge,code_challenge_method:'S256'}).toString();if(method==='Google')u.searchParams.set('identity_provider','Google');else if(email)u.searchParams.set('login_hint',email.trim());location.assign(u.href);
}
export async function completeSignIn():Promise<string|null> {
  const c=config(),params=new URLSearchParams(location.search);if(canonicalPath(location.pathname)!==new URL(c.redirectUri).pathname)return null;
  const stored=sessionStorage.getItem(TRANSACTION);sessionStorage.removeItem(TRANSACTION);history.replaceState(null,'',new URL(c.redirectUri).pathname);
  try{
    const t=stored?JSON.parse(stored):null;
    if((!params.get('code')&&!params.has('error'))||!t?.verifier||!t.nonce||params.get('state')!==t.state||t.binding!==binding(c)||!Number.isFinite(t.createdAt)||Date.now()-t.createdAt>600000||t.createdAt>Date.now())throw new Error('Sign-in could not be verified. Please sign in again.');
    if(params.has('error'))throw new Error(params.get('error')==='access_denied'?'Sign-in was cancelled. You can try again.':'Sign-in failed. You can try again.');
    if(t.method!==undefined&&t.method!=='Google'&&t.method!=='Account')throw new Error('Sign-in could not be verified.');
    const epoch=generation;await accept(await exchange(new URLSearchParams({grant_type:'authorization_code',client_id:c.clientId,code:params.get('code')!,redirect_uri:c.redirectUri,code_verifier:t.verifier}),c),t.nonce,c,epoch,undefined,undefined,t.method??'Google');return requestedWorkspaceRoute(t.returnRoute);
  }catch(e){clearSession();throw e instanceof SyntaxError?new Error('Sign-in could not be verified. Please sign in again.'):e;}
}
export async function restoreSession():Promise<boolean> {
  if(!cloudConfig())return false;const stored=sessionStorage.getItem(SESSION);if(!stored)return false;
  try{const s=JSON.parse(stored) as Session;if(s.binding!==binding(config())||!s.refreshToken||!s.nonce||s.method!==undefined&&s.method!=='Google'&&s.method!=='Account')throw new Error('Session configuration changed.');claims=null;session=s;await getIdentityToken();return Boolean(idToken());}catch(e){clearSession();throw e;}
}
export async function getIdentityToken():Promise<string|null> {
  const c=cloudConfig();if(!c||!session)return null;if(Date.parse(c.expiresAt)<=Date.now()){sessionExpired();throw new Error('This example workspace has expired.');}if(idToken())return idToken();if(refreshing)return refreshing;
  const epoch=generation,previous=session;
  refreshing=(async()=>{try{
    const verified=await verify(previous.idToken,previous.nonce,c,true,true,previous.method??'Google');
    if(epoch!==generation)throw new Error('This session has ended.');
    if(verified.exp*1000>Date.now()+30000){claims=verified;return previous.idToken;}
    await accept(await exchange(new URLSearchParams({grant_type:'refresh_token',client_id:c.clientId,refresh_token:previous.refreshToken}),c),previous.nonce,c,epoch,previous.refreshToken,verified.sub,previous.method??'Google');return idToken();
  }catch(e){if(epoch===generation)sessionExpired();throw e;}finally{if(epoch===generation)refreshing=null;}})();return refreshing;
}
export async function signOut(){
  const previous=session,c=cloudConfig();clearSession();window.dispatchEvent(new Event('jalsetu:session-expired'));sessionStorage.setItem('jalsetu.auth-notice','You have signed out of JalSetu.');if(!c)return;
  try{if(previous)await fetch(new URL('/oauth2/revoke',c.loginBaseUrl),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token:previous.refreshToken,client_id:c.clientId}),signal:AbortSignal.timeout(5000)});}catch{/* Local access is already cleared; continue managed-login logout. */}
  const u=new URL('/logout',c.loginBaseUrl);u.search=new URLSearchParams({client_id:c.clientId,logout_uri:c.logoutUri}).toString();location.assign(u.href);
}

// Signup uses the existing username pool with email as its username. Passwords
// go directly to Cognito over HTTPS and never enter browser storage or our API.
async function emailRequest(action:string,payload:Record<string,unknown>){
  const c=config();if(c.authProvider==='Google')throw new Error('Email accounts have not been enabled yet.');
  if(Date.parse(c.expiresAt)<=Date.now())throw new Error('This example workspace has expired.');
  const response=await fetch(new URL(c.issuer).origin,{method:'POST',headers:{'Content-Type':'application/x-amz-json-1.1','X-Amz-Target':`AWSCognitoIdentityProviderService.${action}`},body:JSON.stringify({ClientId:c.clientId,...payload}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();
  if(!response.ok){const code=String(result.__type??'').split('#').pop();const messages:Record<string,string>={UsernameExistsException:'An account already exists. Sign in or use password reset.',InvalidPasswordException:'Use at least 12 characters with uppercase, lowercase, a number and a symbol.',CodeMismatchException:'That verification code does not match. Try again.',ExpiredCodeException:'That code has expired. Request a new code.',LimitExceededException:'Too many requests. Wait before trying again.',TooManyRequestsException:'Too many requests. Wait before trying again.',InvalidParameterException:'Check your email address and verification code.',UserNotFoundException:'Check the email address used when you created your account.',NotAuthorizedException:'This account may already be verified. Try signing in.'};throw new Error(messages[code??'']??'Cognito could not complete this request. Please try again.');}
}
export async function createEmailAccount(email:string,password:string){const username=email.trim();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username))throw new Error('Enter a valid email address.');await emailRequest('SignUp',{Username:username,Password:password,UserAttributes:[{Name:'email',Value:username}]});}
export async function confirmEmailAccount(email:string,code:string){await emailRequest('ConfirmSignUp',{Username:email.trim(),ConfirmationCode:code.trim()});}
export async function resendEmailCode(email:string){await emailRequest('ResendConfirmationCode',{Username:email.trim()});}
