// Facebook Pages connect tool: login -> saare pages ki list.
// Koi npm package nahi chahiye, sirf Node 20.6+.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI, PORT = 3000 } = process.env;
const GRAPH = 'https://graph.facebook.com/v21.0';
const SCOPES = ['pages_show_list', 'pages_messaging', 'pages_manage_metadata', 'business_management'];
const DATA_FILE = path.join(__dirname, 'data', 'pages.json');

const sessions = new Map(); // sid -> { state, user, pages, log }

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function graph(pathAndQuery, token) {
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  const url = pathAndQuery.startsWith('http') ? pathAndQuery : `${GRAPH}${pathAndQuery}${sep}access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(body.error ? `${body.error.message} (code ${body.error.code})` : `HTTP ${res.status}`);
  return body;
}

// Graph API ke "paging.next" ko follow karke saare items le aata hai.
async function fetchAll(firstPath, token) {
  const items = [];
  let next = firstPath;
  while (next) {
    const page = await graph(next, token);
    items.push(...(page.data || []));
    next = page.paging && page.paging.next;
  }
  return items;
}

async function loadPages(userToken, log) {
  const pages = new Map();
  const fields = 'id,name,category,tasks,access_token,picture{url}';

  // 1) Jo pages seedha is user ke account se juray hain
  try {
    const direct = await fetchAll(`/me/accounts?fields=${fields}&limit=100`, userToken);
    direct.forEach((p) => pages.set(p.id, { ...p, source: 'Direct (me/accounts)' }));
    log.push(`me/accounts se ${direct.length} pages mile`);
  } catch (e) { log.push(`me/accounts fail: ${e.message}`); }

  // 2) Jo pages Business Manager (Meta Business Suite) ke andar hain
  try {
    const businesses = await fetchAll('/me/businesses?fields=id,name&limit=100', userToken);
    log.push(`${businesses.length} Business Manager mile`);
    for (const b of businesses) {
      for (const edge of ['owned_pages', 'client_pages']) {
        try {
          const list = await fetchAll(`/${b.id}/${edge}?fields=id,name,category,picture{url}&limit=100`, userToken);
          list.forEach((p) => { if (!pages.has(p.id)) pages.set(p.id, { ...p, source: `Business: ${b.name} (${edge})` }); });
          log.push(`${b.name} / ${edge}: ${list.length} pages`);
        } catch (e) { log.push(`${b.name} / ${edge} fail: ${e.message}`); }
      }
    }
  } catch (e) { log.push(`me/businesses fail: ${e.message}`); }

  return [...pages.values()];
}

function getSession(req, res) {
  const m = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '');
  let sid = m && m[1];
  if (!sid || !sessions.has(sid)) {
    sid = crypto.randomBytes(16).toString('hex');
    sessions.set(sid, {});
    res.setHeader('Set-Cookie', `sid=${sid}; HttpOnly; SameSite=Lax; Path=/`);
  }
  return sessions.get(sid);
}

function layout(body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FB Pages Connect</title>
<style>
body{font-family:system-ui,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;color:#1c1e21;background:#f0f2f5}
h1{margin-bottom:4px}.card{background:#fff;border-radius:10px;padding:20px;margin:16px 0;box-shadow:0 1px 3px #0002}
.btn{display:inline-block;background:#1877f2;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.btn.alt{background:#e4e6eb;color:#1c1e21}table{width:100%;border-collapse:collapse}
td,th{text-align:left;padding:10px 6px;border-bottom:1px solid #e4e6eb;vertical-align:middle}
img{width:40px;height:40px;border-radius:50%;vertical-align:middle;margin-right:8px}
.muted{color:#65676b;font-size:13px}.ok{color:#0a7d33;font-weight:600}.no{color:#b3261e;font-weight:600}
pre{background:#f0f2f5;padding:10px;border-radius:6px;font-size:12px;white-space:pre-wrap}
</style></head><body><h1>FB Pages Connect</h1><p class="muted">Facebook se login karke dekhein ke aap ke saare Pages aate hain ya nahi.</p>${body}</body></html>`;
}

function homePage(s) {
  if (!FB_APP_ID || !FB_APP_SECRET || !FB_REDIRECT_URI) {
    return layout(`<div class="card"><b class="no">.env file adhoori hai.</b><p><code>.env.example</code> ko <code>.env</code> naam se copy karein aur FB_APP_ID, FB_APP_SECRET bharein. Detail README.md mein hai.</p></div>`);
  }
  if (!s.user) {
    return layout(`<div class="card"><a class="btn" href="/auth/facebook">Facebook se connect karein</a>
<p class="muted">Permissions: ${SCOPES.map(esc).join(', ')}</p></div>`);
  }
  const rows = (s.pages || []).map((p) => `<tr>
<td>${p.picture && p.picture.data ? `<img src="${esc(p.picture.data.url)}" alt="">` : ''}<b>${esc(p.name)}</b><div class="muted">ID: ${esc(p.id)}</div></td>
<td>${esc(p.category)}</td>
<td>${p.access_token ? '<span class="ok">Token mil gaya</span>' : '<span class="no">Token nahi</span>'}</td>
<td class="muted">${esc(p.source)}</td></tr>`).join('');
  return layout(`<div class="card"><b>${esc(s.user.name)}</b> ke naam se connected
<p><a class="btn" href="/auth/facebook">Dobara connect / refresh</a> <a class="btn alt" href="/logout">Disconnect</a></p></div>
<div class="card"><h3>Total pages: ${(s.pages || []).length}</h3>
${rows ? `<table><tr><th>Page</th><th>Category</th><th>Page token</th><th>Kahan se mila</th></tr>${rows}</table>` : '<p>Koi page nahi mila. Neeche "Log" dekhein.</p>'}</div>
<div class="card"><h3>Log</h3><pre>${esc((s.log || []).join('\n'))}</pre>
<p class="muted">Agar koi page missing hai to Facebook ki popup mein sab pages select kiye the? Na kiye hon to "Dobara connect" dabayein aur sab pages tick karein.</p></div>`);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const s = getSession(req, res);
  const send = (code, html) => { res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); };
  const redirect = (to) => { res.writeHead(302, { Location: to }); res.end(); };

  try {
    if (url.pathname === '/') return send(200, homePage(s));

    if (url.pathname === '/auth/facebook') {
      s.state = crypto.randomBytes(16).toString('hex');
      const q = new URLSearchParams({ client_id: FB_APP_ID, redirect_uri: FB_REDIRECT_URI, state: s.state, scope: SCOPES.join(','), auth_type: 'rerequest' });
      return redirect(`https://www.facebook.com/v21.0/dialog/oauth?${q}`);
    }

    if (url.pathname === '/auth/callback') {
      if (url.searchParams.get('error')) return send(400, layout(`<div class="card no">Login cancel/fail: ${esc(url.searchParams.get('error_description') || url.searchParams.get('error'))}<p><a href="/">Wapas</a></p></div>`));
      if (!s.state || url.searchParams.get('state') !== s.state) return send(400, layout('<div class="card no">State match nahi hua. Dobara try karein.</div>'));
      s.state = null;

      const short = await graph(`/oauth/access_token?${new URLSearchParams({ client_id: FB_APP_ID, client_secret: FB_APP_SECRET, redirect_uri: FB_REDIRECT_URI, code: url.searchParams.get('code') })}`, '');
      const long = await graph(`/oauth/access_token?${new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: FB_APP_ID, client_secret: FB_APP_SECRET, fb_exchange_token: short.access_token })}`, '');
      const token = long.access_token;

      s.log = [];
      s.user = await graph('/me?fields=id,name', token);
      s.pages = await loadPages(token, s.log);
      s.log.push(`Kul unique pages: ${s.pages.length}`);

      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify({ user: s.user, pages: s.pages }, null, 2), { mode: 0o600 });
      return redirect('/');
    }

    if (url.pathname === '/logout') { Object.keys(s).forEach((k) => delete s[k]); return redirect('/'); }
    send(404, layout('<div class="card">Page nahi mila.</div>'));
  } catch (e) {
    send(500, layout(`<div class="card no">Error: ${esc(e.message)}<p><a href="/">Wapas</a></p></div>`));
  }
});

server.listen(PORT, () => console.log(`Chal raha hai: http://localhost:${PORT}`));
