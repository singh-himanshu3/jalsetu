export type CloudConfig = { mode:'aws_live'; region:string; apiBaseUrl:string; clientId:string; loginBaseUrl:string; redirectUri:string; expiresAt:string };
let cloud:CloudConfig|null=null;
export const cloudConfig = () => cloud;
export async function loadConfig() {
  const response=await fetch('/config.json',{cache:'no-store'});
  const local=['127.0.0.1','localhost'].includes(location.hostname);
  if(!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
    if(local)return null;
    throw new Error('Hosted configuration is missing. This deployment is not ready.');
  }
  const value=await response.json();
  if(value.mode!=='aws_live'||!['apiBaseUrl','clientId','loginBaseUrl','redirectUri','region','expiresAt'].every(key=>typeof value[key]==='string'&&value[key]))throw new Error('Hosted configuration is invalid.');
  for(const key of ['apiBaseUrl','loginBaseUrl','redirectUri'])if(new URL(value[key]).protocol!=='https:')throw new Error('Hosted services require HTTPS.');
  if(new URL(value.redirectUri).origin!==location.origin)throw new Error('Sign-in callback does not match this deployment.');
  cloud=value as CloudConfig;
  return cloud;
}
