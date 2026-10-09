/** Keep report pickers in IST even when the browser uses another time zone. */
export function istLocalValue(stamp: string): string {
  if (!stamp) return '';
  const date = new Date(stamp);
  if (!Number.isFinite(date.getTime())) return '';
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(date).map(part => [part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}
export function istStamp(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(value)) return '';
  return `${value.length === 16 ? value + ':00' : value}+05:30`;
}
