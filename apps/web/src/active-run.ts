// A navigation reference only. Every restoration still requires the authorized API.
export const activeRunKey = (scope: string) => `jalsetu.active-run:${encodeURIComponent(scope)}`;
export function readActiveRun(scope: string): string | null {
  try { const id=localStorage.getItem(activeRunKey(scope)); return id && /^[\w-]{1,160}$/.test(id) ? id : null; } catch { return null; }
}
export function rememberActiveRun(scope: string, id: string) {
  try { localStorage.setItem(activeRunKey(scope),id); } catch { /* Saved runs remain accessible through the API. */ }
}
export function forgetActiveRun(scope: string) { try { localStorage.removeItem(activeRunKey(scope)); localStorage.removeItem(activeRunKey(scope)+':job'); } catch { /* Storage may be disabled. */ } }
export function pendingRunJob(scope:string,id?:string|null) {
  try { const key=activeRunKey(scope)+':job';if(id===null)localStorage.removeItem(key);else if(id)localStorage.setItem(key,id);return localStorage.getItem(key); } catch { return null; }
}
