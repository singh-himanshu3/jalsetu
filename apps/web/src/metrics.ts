export function formatMetric(key:string,value:number|string|null):string {
  if(value===null)return key==='latest_route_completion_time'?'No scheduled route':'Not applicable';
  if(key.endsWith('_ratio'))return `${(Number(value)*100).toFixed(1)}%`;
  if(key==='latest_route_completion_time') {
    const date=new Date(String(value));
    return Number.isNaN(date.getTime())?'Unavailable timestamp':`${date.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'})} IST`;
  }
  return String(value);
}
