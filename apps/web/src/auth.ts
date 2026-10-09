import { cloudConfig } from './config';

const TOKEN='jalsetu.id-token', VERIFIER='jalsetu.pkce-verifier', STATE='jalsetu.oauth-state';
const base64url=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export function idToken() {
  const token=sessionStorage.getItem(TOKEN);
  if(!token)return null;
  try {const payload=JSON.parse(atob(token.split('.')[1].replaceAll('-','+').replaceAll('_','/')));if(payload.exp*1000<=Date.now()+30000){sessionStorage.removeItem(TOKEN);return null;}return token;}
  catch{sessionStorage.removeItem(TOKEN);return null;}
}
export async function signIn() {
  const config=cloudConfig();if(!config)throw new Error('Cloud sign-in is not configured');
  const verifier=base64url(crypto.getRandomValues(new Uint8Array(48))),state=base64url(crypto.getRandomValues(new Uint8Array(32)));
  sessionStorage.setItem(VERIFIER,verifier);sessionStorage.setItem(STATE,state);
  const challenge=base64url(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const url=new URL('/oauth2/authorize',config.loginBaseUrl);
  url.search=new URLSearchParams({client_id:config.clientId,response_type:'code',scope:'openid',redirect_uri:config.redirectUri,state,code_challenge:challenge,code_challenge_method:'S256'}).toString();
  location.assign(url);
}
export async function completeSignIn() {
  const config=cloudConfig();if(!config)return;
  const params=new URLSearchParams(location.search),code=params.get('code');
  if(params.has('error')){history.replaceState(null,'',location.pathname);throw new Error('Sign-in was not completed. Try again.');}
  if(!code)return;
  const verifier=sessionStorage.getItem(VERIFIER),state=sessionStorage.getItem(STATE);
  history.replaceState(null,'',location.pathname);
  sessionStorage.removeItem(STATE);sessionStorage.removeItem(VERIFIER);
  if(!verifier||!state||params.get('state')!==state)throw new Error('Sign-in could not be verified. Start sign-in again.');
  const response=await fetch(new URL('/oauth2/token',config.loginBaseUrl),{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:config.clientId,code,redirect_uri:config.redirectUri,code_verifier:verifier})});
  if(!response.ok)throw new Error('Sign-in expired or failed. Start sign-in again.');
  const tokens=await response.json();if(typeof tokens.id_token!=='string')throw new Error('Sign-in returned no identity token.');
  sessionStorage.setItem(TOKEN,tokens.id_token);
}
export function signOut() {
  sessionStorage.removeItem(TOKEN);sessionStorage.removeItem(STATE);sessionStorage.removeItem(VERIFIER);
  const config=cloudConfig();if(!config)return;
  const url=new URL('/logout',config.loginBaseUrl);url.search=new URLSearchParams({client_id:config.clientId,logout_uri:config.redirectUri}).toString();location.assign(url);
}
