export type CloudConfig = {mode:'aws_live';authProvider:'Google'|'GoogleAndEmail'|'Email';region:string;apiBaseUrl:string;clientId:string;loginBaseUrl:string;issuer:string;redirectUri:string;logoutUri:string;expiresAt:string};
let cloud:CloudConfig|null=null;
export const cloudConfig=()=>cloud;
export const loopback=(hostname:string)=>['127.0.0.1','localhost'].includes(hostname);
export function validateConfig(value:unknown, origin=location.origin):CloudConfig {
  if(!value||typeof value!=='object')throw new Error('Sign-in configuration is missing.');
  const c=value as CloudConfig;
  if(Object.keys(c).sort().join()!==['mode','authProvider','region','apiBaseUrl','clientId','loginBaseUrl','issuer','redirectUri','logoutUri','expiresAt'].sort().join())throw new Error('Expected public sign-in settings only.');
  if(c.mode!=='aws_live'||!['Google','GoogleAndEmail','Email'].includes(c.authProvider)||c.region!=='ap-south-1'||!['apiBaseUrl','clientId','loginBaseUrl','issuer','redirectUri','logoutUri','expiresAt'].every(k=>typeof (c as unknown as Record<string,unknown>)[k]==='string'&&(c as unknown as Record<string,unknown>)[k]))throw new Error('Sign-in configuration is incomplete.');
  const api=new URL(c.apiBaseUrl),login=new URL(c.loginBaseUrl),issuer=new URL(c.issuer),callback=new URL(c.redirectUri),logout=new URL(c.logoutUri);
  for(const u of [api,login,issuer,callback,logout])if(u.username||u.password||u.search||u.hash||!(u.protocol==='https:'||(loopback(u.hostname)&&u.protocol==='http:'&&u.origin===origin)))throw new Error('Sign-in addresses must use HTTPS, except this localhost callback.');
  if(!/^[a-z0-9-]+\.auth\.ap-south-1\.amazoncognito\.com$/.test(login.hostname)||login.pathname!=='/'||login.port||issuer.origin!=='https://cognito-idp.ap-south-1.amazonaws.com'||!/^\/ap-south-1_[A-Za-z0-9]+$/.test(issuer.pathname)||!/^https:\/\/[a-z0-9]+\.execute-api\.ap-south-1\.amazonaws\.com\/[A-Za-z0-9_-]+$/.test(c.apiBaseUrl))throw new Error('Expected the Mumbai Cognito and API endpoints.');
  if(callback.origin!==origin||callback.pathname!=='/auth/callback'||logout.origin!==origin||logout.pathname!=='/'||!Number.isFinite(Date.parse(c.expiresAt))||!/^[a-z0-9]+$/.test(c.clientId))throw new Error('Sign-in callback or logout address does not match this website.');
  return c;
}
export async function loadConfig() {
  cloud=null;
  const env=import.meta.env??{};
  if(env.VITE_JALSETU_AUTH_MODE==='cognito') {
    cloud=validateConfig({mode:'aws_live',authProvider:env.VITE_JALSETU_AUTH_PROVIDER??'Email',region:'ap-south-1',apiBaseUrl:env.VITE_JALSETU_API_BASE_URL,clientId:env.VITE_JALSETU_COGNITO_CLIENT_ID,loginBaseUrl:env.VITE_JALSETU_COGNITO_DOMAIN,issuer:env.VITE_JALSETU_COGNITO_ISSUER,redirectUri:env.VITE_JALSETU_CALLBACK_URL,logoutUri:env.VITE_JALSETU_LOGOUT_URL,expiresAt:env.VITE_JALSETU_EXPIRES_AT});return cloud;
  }
  const response=await fetch('/config.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok||!response.headers.get('content-type')?.includes('application/json')) {
    if(loopback(location.hostname))return null;
    throw new Error('Hosted Sign-in configuration is missing.');
  }
  cloud=validateConfig(await response.json());return cloud;
}
export function localDevelopmentEnabled(){return loopback(location.hostname)&&import.meta.env?.VITE_JALSETU_LOCAL_DEVELOPMENT==='true';}
