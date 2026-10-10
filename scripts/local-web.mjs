import {readFile, readdir} from 'node:fs/promises';
import {resolve, extname} from 'node:path';

const types = {'.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.ico':'image/x-icon', '.webp':'image/webp', '.woff':'font/woff', '.woff2':'font/woff2'};

// Load only the built entry and assets. Never serve source, saved data or cloud config.
export async function localWeb(directory) {
  const files = new Map();
  let index;
  try { index = await readFile(resolve(directory, 'index.html')); }
  catch { throw new Error('The built app is missing. Run pnpm build, then start JalSetu again.'); }
  files.set('/', {body:index, type:'text/html; charset=utf-8'});
  files.set('/index.html', files.get('/'));
  async function assets(path, prefix) {
    for (const item of await readdir(path, {withFileTypes:true})) {
      const full = resolve(path, item.name), url = `${prefix}/${item.name}`;
      if (item.isDirectory()) await assets(full, url);
      else if (item.isFile() && types[extname(item.name)]) files.set(url, {body:await readFile(full), type:types[extname(item.name)]});
    }
  }
  await assets(resolve(directory, 'assets'), '/assets');
  return (req, res) => {
    const headers = {'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'no-referrer', 'X-Frame-Options':'DENY',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://tile.openstreetmap.org; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"};
    function plain(status, message) {
      res.writeHead(status, {...headers, 'Content-Type':'text/plain; charset=utf-8'});
      res.end(req.method === 'HEAD' ? undefined : message);
    }
    if (!['GET','HEAD'].includes(req.method)) return plain(405, 'This page accepts read requests only.');
    let path;
    try { path = decodeURIComponent(req.url.split('?')[0]); }
    catch { return plain(400, 'This page address is invalid.'); }
    const file = files.get(path);
    if (!file) return plain(404, 'This page is unavailable. Open the JalSetu home page to continue.');
    res.writeHead(200, {...headers, 'Content-Type':file.type, 'Content-Length':file.body.length});
    res.end(req.method === 'HEAD' ? undefined : file.body);
  };
}
