export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false, closed = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else field += c;
    } else if (c === ',' || c === '\n' || c === '\r') {
      row.push(field); field = ''; closed = false;
      if (c !== ',') { if (row.some(cell => cell !== '')) rows.push(row); row = []; if (c === '\r' && text[i + 1] === '\n') i++; }
    } else if (c === '"') {
      if (field || closed) throw new Error('Quote appears inside an unquoted CSV field');
      quoted = true;
    } else {
      if (closed) throw new Error('Unexpected character after a closing CSV quote');
      field += c;
    }
  }
  if (quoted) throw new Error('CSV contains an unclosed quoted field');
  row.push(field); if (row.some(cell => cell !== '')) rows.push(row);
  if (rows.length < 2) throw new Error('CSV needs a header and at least one data row');
  const header = rows.shift().map(cell => cell.trim());
  if (new Set(header).size !== header.length || header.some(cell => !cell)) throw new Error('CSV headers must be unique and non-empty');
  return rows.map((cells, i) => {
    if (cells.length !== header.length) throw new Error(`CSV row ${i + 2} has the wrong number of fields`);
    return Object.fromEntries(header.map((key, j) => [key, cells[j].trim()]));
  });
}

export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function encodeCsv(rows) { return rows.map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n'; }

const integerFields = new Set(['requested_litres', 'minimum_useful_litres', 'receiving_limit_litres', 'service_duration_minutes']);
const supported = new Set(['site_id', ...integerFields, 'priority_class', 'confirmation_status', 'opens_at', 'closes_at', 'priority_reason']);
export function mergeSiteCsv(sites, text) {
  const rows = parseCsv(text), seen = new Set();
  const lookup = new Map(sites.map(site => [site.site_id, { ...site }]));
  for (const row of rows) {
    if (!row.site_id || !lookup.has(row.site_id)) throw new Error(`Unknown site ID ${row.site_id ?? '(missing)'}. This import updates existing example points only.`);
    if (seen.has(row.site_id)) throw new Error(`Duplicate site ID ${row.site_id}`);
    seen.add(row.site_id);
    const site = lookup.get(row.site_id);
    for (const [key, value] of Object.entries(row)) {
      if (!supported.has(key)) throw new Error(`Unsupported CSV column ${key}`);
      if (key === 'site_id') continue;
      if (integerFields.has(key)) {
        if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error(`${row.site_id}: ${key} requires a non-negative integer`);
        site[key] = Number(value);
      } else site[key] = value;
    }
  }
  return sites.map(site => lookup.get(site.site_id));
}
