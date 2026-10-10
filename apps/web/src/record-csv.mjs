import { parseCsv, encodeCsv } from './csv.mjs';

export const recordHeaders = ['Point name', 'Longitude', 'Latitude', 'Requested litres', 'Minimum useful litres', 'Receiving limit litres', 'Opens at (IST)', 'Closes at (IST)', 'Unloading minutes', 'Priority', 'Priority reason', 'Request status'];
export function recordTemplate() { return encodeCsv([recordHeaders, recordHeaders.map(()=> '')]); }
export function readRecordSites(text, day) {
  const rows = parseCsv(text);
  if (rows.length > 20) throw new Error('This pilot supports at most twenty receiving points');
  return rows.map((row, i) => {
    if (Object.keys(row).length !== recordHeaders.length || recordHeaders.some(key=>!(key in row))) throw new Error('Use the downloaded receiving-point template with all its column headings');
    const number = (key, integer=false) => {
      if (!row[key] || !/^(?:-?\d+(?:\.\d+)?|-?\.\d+)$/.test(row[key])) throw new Error(`Row ${i+2}: enter a recorded number for ${key}`);
      const value=Number(row[key]);
      if (!Number.isFinite(value) || (integer && (!Number.isSafeInteger(value) || value<0))) throw new Error(`Row ${i+2}: ${key} needs a non-negative whole number`);
      return value;
    };
    const time = key => {
      if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(row[key])) throw new Error(`Row ${i+2}: ${key} must use HH:MM, for example the format 08:30`);
      return `${day}T${row[key]}:00+05:30`;
    };
    return {site_id:`POINT-${i+1}`,name:row['Point name'],location:{longitude:number('Longitude'),latitude:number('Latitude')},
      requested_litres:number('Requested litres',true),minimum_useful_litres:number('Minimum useful litres',true),
      receiving_limit_litres:number('Receiving limit litres',true),opens_at:time('Opens at (IST)'),closes_at:time('Closes at (IST)'),
      service_duration_minutes:number('Unloading minutes',true),priority_class:row.Priority,priority_reason:row['Priority reason'],
      confirmation_status:row['Request status'],provenance:'operator_entered'};
  });
}
