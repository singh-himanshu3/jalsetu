import { cloudConfig } from './config';
import { idToken } from './auth';

export async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const config=cloudConfig(),token=config?idToken():null;
  if(config&&!token)throw new Error('Your session expired. Sign out and sign in again; saved projects remain available.');
  const headers=new Headers(options?.headers);if(token)headers.set('Authorization',token);
  const res = await fetch((config?.apiBaseUrl??'')+url, {...options,headers});
  let value;
  try { value = await res.json(); }
  catch { throw new Error('The service could not complete this request. Please try again.'); }
  if (!res.ok) {
    const details = (value.error?.details ?? []).map((item: { field: string; message: string }) => `${item.field.replaceAll('_', ' ').replaceAll('.', ' · ')}: ${item.message}`);
    throw new Error([value.error?.message ?? 'Request failed', ...details].join('\n'));
  }
  return value;
}
export const postOptions = (body: unknown, version?: number): RequestInit => ({ method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID(), ...(version === undefined ? {} : { 'If-Match': String(version) }) }, body: JSON.stringify(body) });
