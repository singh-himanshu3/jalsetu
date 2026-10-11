export const workspaceRoutes:Record<string,string>={Overview:'/workspace',Inputs:'/workspace/inputs',Plan:'/workspace/plan',Operations:'/workspace/deliveries',Compare:'/workspace/compare',History:'/workspace/history',Evidence:'/workspace/evidence'};
// Amplify canonicalizes extensionless URLs with a trailing slash.
export function canonicalPath(path:string){return path.replace(/\/+$/,'')||'/';}
export function requestedWorkspaceRoute(path:string){const canonical=canonicalPath(path);return Object.values(workspaceRoutes).includes(canonical)?canonical:'/workspace';}
export function workspaceTab(path:string){const canonical=canonicalPath(path);return Object.keys(workspaceRoutes).find(tab=>workspaceRoutes[tab]===canonical)??'Overview';}
export function isWorkspaceRoute(path:string){const canonical=canonicalPath(path);return canonical==='/workspace'||canonical.startsWith('/workspace/')||canonical==='/dashboard'||canonical.startsWith('/dashboard/');}
export function navigate(path:string,replace=false){history[replace?'replaceState':'pushState'](null,'',path);window.dispatchEvent(new Event('jalsetu:navigate'));}
