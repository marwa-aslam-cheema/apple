// Page Direct: Facebook Pages ka dashboard (login, inbox, leads, templates, bulk campaigns).
// Koi npm package nahi chahiye, sirf Node 20.6+. Sirf apne computer par (127.0.0.1) chalta hai.
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI, FB_CONFIG_ID, PORT = 3000 } = process.env;
const GRAPH = process.env.FB_GRAPH_BASE || 'https://graph.facebook.com/v21.0';
const SEND_DELAY_MS = Number(process.env.SEND_DELAY_MS || 300);
const SCOPES = ['pages_show_list', 'pages_messaging', 'pages_manage_metadata', 'business_management'];
const TAGS = ['RESPONSE', 'POST_PURCHASE_UPDATE', 'CONFIRMED_EVENT_UPDATE', 'ACCOUNT_UPDATE', 'HUMAN_AGENT'];
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// ---------- storage (ek JSON file) ----------
let store = { user: null, userToken: null, pages: [], leads: {}, labels: [], templates: [], campaigns: [], logs: [] };
try { store = { ...store, ...JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) }; } catch { /* pehli dafa */ }
store.campaigns.forEach((c) => { if (c.status === 'running') c.status = 'interrupted'; });

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DATA_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(store), { mode: 0o600 });
    fs.renameSync(tmp, DATA_FILE);
  }, 100);
}
const uid = () => crypto.randomBytes(6).toString('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Graph API ----------
async function graph(pathAndQuery, token, opts = {}) {
  const sep = pathAndQuery.includes('?') ? '&' : '?';
  const url = pathAndQuery.startsWith('http') ? pathAndQuery : `${GRAPH}${pathAndQuery}${token ? `${sep}access_token=${encodeURIComponent(token)}` : ''}`;
  const res = await fetch(url, opts);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error(body.error ? `${body.error.message} (code ${body.error.code})` : `HTTP ${res.status}`);
  return body;
}

async function fetchAll(firstPath, token, maxItems = 5000) {
  const items = [];
  let next = firstPath;
  while (next && items.length < maxItems) {
    const page = await graph(next, token);
    items.push(...(page.data || []));
    next = page.paging && page.paging.next;
  }
  return items;
}

async function loadPages(userToken, log) {
  const pages = new Map();
  const fields = 'id,name,category,tasks,access_token,picture{url}';
  try {
    const direct = await fetchAll(`/me/accounts?fields=${fields}&limit=100`, userToken);
    direct.forEach((p) => pages.set(p.id, { ...p, source: 'Direct (me/accounts)' }));
    log.push(`me/accounts se ${direct.length} pages mile`);
  } catch (e) { log.push(`me/accounts fail: ${e.message}`); }

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

  // Business wale pages ka token alag se mangna parta hai
  for (const p of pages.values()) {
    if (p.access_token) continue;
    try { p.access_token = (await graph(`/${p.id}?fields=access_token`, userToken)).access_token; }
    catch (e) { log.push(`${p.name}: page token nahi mila (${e.message})`); }
  }
  return [...pages.values()];
}

const findPage = (id) => store.pages.find((p) => p.id === id);
function requirePage(id) {
  const p = findPage(id);
  if (!p) throw httpError(404, 'Page nahi mila. Pehle Pages mein connect karein.');
  if (!p.access_token) throw httpError(400, `${p.name} ka page token nahi hai. Dobara connect karke is page ko select karein.`);
  return p;
}
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

async function sendMessage(page, psid, text, tag) {
  const body = { recipient: { id: psid }, message: { text } };
  if (!tag || tag === 'RESPONSE') body.messaging_type = 'RESPONSE';
  else { body.messaging_type = 'MESSAGE_TAG'; body.tag = tag; }
  return graph(`/${page.id}/messages`, page.access_token, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// %name% / {fullname} = poora Facebook naam, {name} = pehla naam, {page} = page ka naam
const render = (text, lead, page) => text
  .replace(/%name%|\{fullname\}/gi, () => lead.name || 'dost')
  .replace(/\{name\}/gi, () => (lead.name || '').split(' ')[0] || 'dost')
  .replace(/\{page\}|%page%/gi, () => page.name);

// Tayyar starter messages: har tag ke allowed use ke hisaab se. Aap inhe edit kar sakte hain.
const STARTERS = [
  { id: 's1', name: 'Order shipped', tag: 'POST_PURCHASE_UPDATE', text: 'Hi %name%, your order has been shipped and is on its way. Tracking details: [add tracking info]' },
  { id: 's2', name: 'Order delivered', tag: 'POST_PURCHASE_UPDATE', text: 'Hi %name%, your order has been delivered. If anything is wrong, just reply to this message and we will fix it.' },
  { id: 's3', name: 'Payment received', tag: 'POST_PURCHASE_UPDATE', text: 'Hi %name%, we have received your payment of [amount]. Thank you!' },
  { id: 's4', name: 'Booking reminder', tag: 'CONFIRMED_EVENT_UPDATE', text: 'Hi %name%, a reminder about your booking on [date] at [time]. See you then!' },
  { id: 's5', name: 'Event time changed', tag: 'CONFIRMED_EVENT_UPDATE', text: 'Hi %name%, the time of your booking has changed to [new date and time]. Please reply to confirm.' },
  { id: 's6', name: 'Application / request status', tag: 'ACCOUNT_UPDATE', text: 'Hi %name%, the status of your request has been updated: [status].' },
  { id: 's7', name: 'Support answer', tag: 'HUMAN_AGENT', text: 'Hi %name%, thanks for waiting. Here is the answer to your question: [answer]' },
];

function addLog(entry) {
  store.logs.push({ id: uid(), time: new Date().toISOString(), ...entry });
  if (store.logs.length > 5000) store.logs.splice(0, store.logs.length - 5000);
  save();
}

// ---------- leads ----------
async function syncLeads(page) {
  const convs = await fetchAll(`/${page.id}/conversations?fields=id,updated_time,snippet,participants&platform=messenger&limit=50`, page.access_token, 2000);
  let added = 0;
  for (const c of convs) {
    const user = ((c.participants && c.participants.data) || []).find((p) => p.id !== page.id);
    if (!user) continue;
    const key = `${page.id}:${user.id}`;
    if (!store.leads[key]) { store.leads[key] = { id: key, pageId: page.id, psid: user.id, name: user.name || 'Unknown', labels: [] }; added++; }
    Object.assign(store.leads[key], { name: user.name || store.leads[key].name, conversationId: c.id, lastMessageAt: c.updated_time, snippet: c.snippet });
  }
  save();
  return { total: convs.length, added };
}

// ---------- campaigns ----------
async function runCampaign(c) {
  c.status = 'running'; save();
  let streak = 0; // lagatar fail: 5 ke baad rok dete hain taake Facebook spam na samjhe
  for (const t of c.targets) {
    if (c.cancelled) break;
    if (streak >= 5) { c.status = 'stopped'; save(); return; }
    const lead = store.leads[t];
    const page = lead && findPage(lead.pageId);
    if (!lead || !page || !page.access_token) { c.failed++; continue; }
    try {
      await sendMessage(page, lead.psid, render(c.text, lead, page), c.tag);
      c.sent++; streak = 0;
      addLog({ kind: 'campaign', campaignId: c.id, pageId: page.id, pageName: page.name, leadName: lead.name, status: 'sent' });
    } catch (e) {
      c.failed++; streak++;
      c.lastError = e.message;
      addLog({ kind: 'campaign', campaignId: c.id, pageId: page.id, pageName: page.name, leadName: lead.name, status: 'failed', error: e.message });
    }
    save();
    await sleep(SEND_DELAY_MS);
  }
  c.status = c.cancelled ? 'cancelled' : 'done';
  save();
}

const publicPage = ({ access_token, ...p }) => ({ ...p, hasToken: !!access_token });
const publicCampaign = ({ targets, ...c }) => ({ ...c, total: targets.length });

// ---------- API ----------
async function api(req, url, body) {
  const m = req.method;
  const p = url.pathname;
  let r;

  if (m === 'GET' && p === '/api/state') {
    const month = new Date().toISOString().slice(0, 7);
    return {
      configured: !!(FB_APP_ID && FB_APP_SECRET && FB_REDIRECT_URI),
      user: store.user,
      pages: store.pages.map(publicPage),
      stats: {
        sentThisMonth: store.logs.filter((l) => l.status === 'sent' && l.time.startsWith(month)).length,
        leads: Object.keys(store.leads).length,
        pages: store.pages.length,
        templates: store.templates.length,
      },
      campaigns: store.campaigns.slice(-5).reverse().map(publicCampaign),
      tags: TAGS,
    };
  }

  if (m === 'GET' && p === '/api/permissions') {
    if (!store.userToken) return { granted: [], declined: [] };
    const d = (await graph('/me/permissions', store.userToken)).data || [];
    return { granted: d.filter((x) => x.status === 'granted').map((x) => x.permission), declined: d.filter((x) => x.status !== 'granted').map((x) => x.permission) };
  }

  if (m === 'POST' && (r = p.match(/^\/api\/pages\/(\d+)\/sync$/))) return syncLeads(requirePage(r[1]));

  if (m === 'GET' && p === '/api/leads') {
    return Object.values(store.leads).sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
  }
  if (m === 'POST' && (r = p.match(/^\/api\/leads\/([\d:]+)\/labels$/))) {
    const lead = store.leads[r[1]];
    if (!lead) throw httpError(404, 'Lead nahi mila');
    lead.labels = (body.labels || []).filter((id) => store.labels.some((l) => l.id === id));
    save();
    return lead;
  }

  if (m === 'GET' && p === '/api/labels') return store.labels;
  if (m === 'POST' && p === '/api/labels') {
    if (!body.name || !String(body.name).trim()) throw httpError(400, 'Label ka naam likhein');
    const label = { id: uid(), name: String(body.name).trim().slice(0, 40), color: /^#[0-9a-f]{6}$/i.test(body.color) ? body.color : '#1877f2' };
    store.labels.push(label); save();
    return label;
  }
  if (m === 'DELETE' && (r = p.match(/^\/api\/labels\/(\w+)$/))) {
    store.labels = store.labels.filter((l) => l.id !== r[1]);
    Object.values(store.leads).forEach((l) => { l.labels = l.labels.filter((id) => id !== r[1]); });
    save();
    return { ok: true };
  }

  if (m === 'GET' && p === '/api/starters') return STARTERS;
  if (m === 'GET' && p === '/api/templates') return store.templates;
  if (m === 'POST' && p === '/api/templates') {
    if (!body.name || !body.text || !String(body.text).trim()) throw httpError(400, 'Template ka naam aur text dono chahiye');
    if (String(body.text).length > 2000) throw httpError(400, 'Text 2000 characters se chota rakhein');
    const t = { id: uid(), name: String(body.name).trim().slice(0, 60), text: String(body.text), tag: TAGS.includes(body.tag) ? body.tag : 'POST_PURCHASE_UPDATE' };
    store.templates.push(t); save();
    return t;
  }
  if (m === 'DELETE' && (r = p.match(/^\/api\/templates\/(\w+)$/))) {
    store.templates = store.templates.filter((t) => t.id !== r[1]); save();
    return { ok: true };
  }

  if (m === 'GET' && (r = p.match(/^\/api\/pages\/(\d+)\/conversations$/))) {
    const page = requirePage(r[1]);
    await syncLeads(page);
    return Object.values(store.leads).filter((l) => l.pageId === page.id && l.conversationId)
      .sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
  }
  if (m === 'GET' && (r = p.match(/^\/api\/pages\/(\d+)\/conversations\/([\w:]+)\/messages$/))) {
    const page = requirePage(r[1]);
    const msgs = await graph(`/${r[2]}/messages?fields=message,from,created_time&limit=50`, page.access_token);
    return (msgs.data || []).reverse().map((x) => ({ id: x.id, text: x.message, mine: x.from && x.from.id === page.id, time: x.created_time }));
  }
  if (m === 'POST' && p === '/api/inbox/send') {
    const page = requirePage(body.pageId);
    const lead = store.leads[`${body.pageId}:${body.psid}`];
    if (!lead) throw httpError(404, 'Lead nahi mila');
    if (!body.text || !String(body.text).trim()) throw httpError(400, 'Message khali hai');
    if (body.tag && !TAGS.includes(body.tag)) throw httpError(400, 'Tag galat hai');
    try {
      await sendMessage(page, lead.psid, String(body.text), body.tag);
      addLog({ kind: 'inbox', pageId: page.id, pageName: page.name, leadName: lead.name, status: 'sent' });
    } catch (e) {
      addLog({ kind: 'inbox', pageId: page.id, pageName: page.name, leadName: lead.name, status: 'failed', error: e.message });
      throw httpError(400, e.message);
    }
    return { ok: true };
  }

  if (m === 'GET' && p === '/api/campaigns') return store.campaigns.slice().reverse().map(publicCampaign);
  if (m === 'POST' && p === '/api/campaigns') {
    const ids = [...new Set(Array.isArray(body.pageIds) ? body.pageIds : [])];
    if (!ids.length) throw httpError(400, 'Kam az kam ek page chunein');
    const pages = ids.map(requirePage);
    const tpl = store.templates.find((t) => t.id === body.templateId) || STARTERS.find((t) => t.id === body.templateId) || null;
    const text = String(body.text ?? (tpl && tpl.text) ?? '').trim();
    if (!text) throw httpError(400, 'Message likhein ya template chunein');
    if (text.length > 2000) throw httpError(400, 'Text 2000 characters se chota rakhein');
    if (!TAGS.includes(body.tag)) throw httpError(400, 'Tag chunein');
    if (store.campaigns.some((c) => c.status === 'running')) throw httpError(409, 'Pehle se ek campaign chal raha hai');
    let leads = Object.values(store.leads).filter((l) => ids.includes(l.pageId));
    if (body.labelId) leads = leads.filter((l) => l.labels.includes(body.labelId));
    if (!leads.length) throw httpError(400, 'Is audience mein koi lead nahi. Pehle Pages mein "Leads sync" karein.');
    const c = { id: uid(), name: String(body.name || (tpl && tpl.name) || 'Campaign').slice(0, 80), pageIds: ids, pageName: pages.map((x) => x.name).join(', '), templateName: tpl ? tpl.name : '-', text, tag: body.tag, labelId: body.labelId || null, createdAt: new Date().toISOString(), status: 'queued', sent: 0, failed: 0, cancelled: false, targets: leads.map((l) => l.id) };
    store.campaigns.push(c); save();
    runCampaign(c).catch((e) => { c.status = 'failed'; c.error = e.message; save(); });
    return publicCampaign(c);
  }
  if (m === 'POST' && (r = p.match(/^\/api\/campaigns\/(\w+)\/cancel$/))) {
    const c = store.campaigns.find((x) => x.id === r[1]);
    if (!c) throw httpError(404, 'Campaign nahi mila');
    c.cancelled = true; save();
    return publicCampaign(c);
  }

  if (m === 'GET' && p === '/api/logs') return store.logs.slice(-300).reverse();

  throw httpError(404, 'API nahi mili');
}

// ---------- server ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
let oauthState = null;

const readBody = (req) => new Promise((resolve, reject) => {
  let data = '';
  req.on('data', (c) => { data += c; if (data.length > 1e6) reject(httpError(413, 'Body bohat bari hai')); });
  req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(httpError(400, 'JSON galat hai')); } });
});

const errorPage = (msg) => `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;max-width:600px;margin:40px auto"><h3>${String(msg).replace(/[&<>]/g, '')}</h3><a href="/">Wapas</a>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
  const redirect = (to) => { res.writeHead(302, { Location: to }); res.end(); };

  try {
    if (url.pathname.startsWith('/api/')) {
      let body = {};
      if (req.method !== 'GET') {
        // Dusri websites se forged requests rokne ke liye
        if (!(req.headers['content-type'] || '').includes('application/json')) throw httpError(415, 'JSON chahiye');
        body = await readBody(req);
      }
      return json(200, await api(req, url, body));
    }

    if (url.pathname === '/auth/facebook') {
      if (!FB_APP_ID || !FB_APP_SECRET || !FB_REDIRECT_URI) throw httpError(500, '.env file adhoori hai (FB_APP_ID, FB_APP_SECRET, FB_REDIRECT_URI)');
      oauthState = crypto.randomBytes(16).toString('hex');
      const q = new URLSearchParams({ client_id: FB_APP_ID, redirect_uri: FB_REDIRECT_URI, state: oauthState });
      if (FB_CONFIG_ID) { q.set('config_id', FB_CONFIG_ID); q.set('response_type', 'code'); q.set('override_default_response_type', 'true'); }
      else { q.set('scope', SCOPES.join(',')); q.set('auth_type', 'rerequest'); }
      return redirect(`https://www.facebook.com/v21.0/dialog/oauth?${q}`);
    }

    if (url.pathname === '/auth/callback') {
      if (url.searchParams.get('error')) throw httpError(400, `Login cancel/fail: ${url.searchParams.get('error_description') || url.searchParams.get('error')}`);
      if (!oauthState || url.searchParams.get('state') !== oauthState) throw httpError(400, 'State match nahi hua. Dobara try karein.');
      oauthState = null;
      const short = await graph(`/oauth/access_token?${new URLSearchParams({ client_id: FB_APP_ID, client_secret: FB_APP_SECRET, redirect_uri: FB_REDIRECT_URI, code: url.searchParams.get('code') })}`, '');
      const long = await graph(`/oauth/access_token?${new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: FB_APP_ID, client_secret: FB_APP_SECRET, fb_exchange_token: short.access_token })}`, '');
      const log = [];
      store.userToken = long.access_token;
      store.user = await graph('/me?fields=id,name', store.userToken);
      store.pages = await loadPages(store.userToken, log);
      addLog({ kind: 'connect', status: 'sent', pageName: '-', leadName: store.user.name, error: log.join(' | ') });
      save();
      return redirect('/#pages');
    }

    if (url.pathname === '/auth/logout') {
      store.user = null; store.userToken = null; store.pages = []; save();
      return redirect('/');
    }

    // static files
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR + path.sep) || !MIME[path.extname(file)] || !fs.existsSync(file)) throw httpError(404, 'Page nahi mila');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    const status = e.status || 500;
    if (url.pathname.startsWith('/api/')) return json(status, { error: e.message });
    res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(errorPage(e.message));
  }
});

server.listen(PORT, '127.0.0.1', () => console.log(`Chal raha hai: http://localhost:${PORT}`));
