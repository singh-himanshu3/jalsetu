import { istLocalValue, istStamp } from './date-time';

export default function ReportTime({ label, value, onChange }: { label:string; value:string; onChange:(value:string)=>void }) {
  return <label>{label} (IST)<input type="datetime-local" step="1" value={istLocalValue(value)} onInput={event => onChange(istStamp(event.currentTarget.value))}/></label>;
}
