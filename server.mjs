import http from 'node:http';
import path from 'node:path';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import session from './api/session.mjs';
import data from './api/data.mjs';
import google from './api/google.mjs';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)),'public');
const config = JSON.parse(await readFile(new URL('./vercel.json',import.meta.url),'utf8'));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.csv':'text/csv; charset=utf-8'};
const routes = {'/api/session':session,'/api/data':data,'/api/auth/google':google,'/api/auth/google/callback':google};
const server = http.createServer(async (req,res) => {
  for (const h of config.headers[0].headers) res.setHeader(h.key,h.value);
  try {
    const url = new URL(req.url,'http://localhost');
    if (routes[url.pathname]) return await routes[url.pathname](req,res);
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);return res.end();}
    const target = path.resolve(root,`.${decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)}`);
    if (!target.startsWith(root + path.sep)) {res.writeHead(403);return res.end();}
    const content = await readFile(target);
    res.setHeader('Content-Type',types[path.extname(target)] || 'application/octet-stream');
    res.setHeader('Cache-Control','no-cache');res.end(req.method === 'HEAD' ? undefined : content);
  } catch {res.writeHead(404);res.end('Not found');}
});
const port = Number(process.env.PORT || 4180);
server.listen(port,process.env.HOST || '127.0.0.1',() => console.log(`Luy: http://localhost:${port}`));
for (const signal of ['SIGTERM','SIGINT']) process.on(signal,() => server.close(() => process.exit(0)));
