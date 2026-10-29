const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TAG_NAMES = {
  RESPONSE: 'Normal reply (24 ghante ke andar)',
  POST_PURCHASE_UPDATE: 'Post-purchase update (order/delivery)',
  CONFIRMED_EVENT_UPDATE: 'Event/booking update',
  ACCOUNT_UPDATE: 'Account update',
  HUMAN_AGENT: 'Human agent (support, 7 din)',
};
const tagOptions = (sel, skipResponse) => Object.entries(TAG_NAMES).filter(([k]) => !(skipResponse && k === 'RESPONSE'))
  .map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
const ago = (iso) => { if (!iso) return '-'; const d = new Date(iso); return d.toLocaleString(); };

let state = null;
let pollTimer = null;

async function api(path, method = 'GET', body) {
  const res = await fetch(path, { method, headers: body ? { 'Content-Type': 'application/json' } : (method === 'GET' ? {} : { 'Content-Type': 'application/json' }), body: body ? JSON.stringify(body) : (method === 'GET' ? undefined : '{}') });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, 4000); }
function insertAtCursor(el, text) { const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a; el.value = el.value.slice(0, a) + text + el.value.slice(b); el.focus(); el.selectionStart = el.selectionEnd = a + text.length; el.dispatchEvent(new Event('input')); }
const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } };

const VIEWS = { dashboard: dashboard, pages: pages, leads: leads, labels: labels, inbox: inbox, library: library, campaigns: campaigns, logs: logs };
const NAMES = { dashboard: 'Dashboard', pages: 'Pages', leads: 'Leads', labels: 'Labels', inbox: 'Inbox', library: 'Library', campaigns: 'Bulk Campaigns', logs: 'Logs' };

async function route() {
  clearInterval(pollTimer);
  const name = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'dashboard';
  $('#nav').innerHTML = Object.entries(NAMES).map(([k, v]) => `<a href="#${k}" class="${k === name ? 'on' : ''}">${v}</a>`).join('');
  try {
    state = await api('/api/state');
    $('#who').textContent = state.user ? `${state.user.name} connected` : 'Facebook connect nahi hai';
    $('#sent').textContent = `${state.stats.sentThisMonth} msgs is mahine`;
    await VIEWS[name]();
  } catch (e) { $('#view').innerHTML = `<div class="card bad">${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', route);

function connectBox() {
  if (!state.configured) return `<div class="card warn"><b>.env file adhoori hai.</b> FB_APP_ID, FB_APP_SECRET aur FB_REDIRECT_URI bharein (README dekhein), phir server dobara chalayein.</div>`;
  return '';
}

// ---------- Dashboard ----------
async function dashboard() {
  const s = state.stats;
  const stat = (label, n, sub) => `<div class="card stat"><div class="muted">${label}</div><div class="n">${n}</div><div class="muted">${sub}</div></div>`;
  $('#view').innerHTML = `<h1>Dashboard</h1><p class="muted">Aap ke saare Pages ek nazar mein.</p>${connectBox()}
  <div class="grid">${stat('Messages sent', s.sentThisMonth, 'is mahine')}${stat('Leads', s.leads, 'saare pages mila kar')}${stat('Pages connected', s.pages, 'total')}${stat('Templates', s.templates, 'Library mein')}</div>
  <div class="card"><div class="row" style="justify-content:space-between"><h3>Connected pages</h3><a class="btn alt" href="#pages">Sab pages</a></div>
  ${state.pages.length ? state.pages.map((p) => `<span style="display:inline-block;margin:4px 14px 4px 0">${p.picture && p.picture.data ? `<img class="avatar" src="${esc(p.picture.data.url)}" alt="">` : ''}${esc(p.name)}</span>`).join('') : `<p class="muted">Abhi koi page connect nahi.</p>${state.configured ? '<a class="btn" href="/auth/facebook">Connect a Page</a>' : ''}`}</div>
  <div class="card"><h3>Recent campaigns</h3>${state.campaigns.length ? `<table><tr><th>Naam</th><th>Page</th><th>Status</th><th>Sent</th></tr>${state.campaigns.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.pageName)}</td><td>${esc(c.status)}</td><td>${c.sent}/${c.total}</td></tr>`).join('')}</table>` : '<p class="muted">Abhi koi campaign nahi.</p>'}</div>`;
}

// ---------- Pages ----------
async function pages() {
  $('#view').innerHTML = `<h1>Pages</h1>${connectBox()}
  <div class="card"><div class="row">${state.configured ? `<a class="btn" href="/auth/facebook">${state.user ? 'Dobara connect / refresh' : 'Facebook se connect karein'}</a>` : ''}${state.user ? '<a class="btn alt" href="/auth/logout">Disconnect</a>' : ''}</div>
  <p class="muted">Popup mein sab Pages select karein, warna wo list mein nahi aayenge.</p></div>
  <div class="card"><h3>Total pages: ${state.pages.length}</h3>${state.pages.length ? `<table><tr><th>Page</th><th>Category</th><th>Token</th><th>Source</th><th></th></tr>${state.pages.map((p) => `<tr><td>${p.picture && p.picture.data ? `<img class="avatar" src="${esc(p.picture.data.url)}" alt="">` : ''}<b>${esc(p.name)}</b><div class="muted">ID: ${esc(p.id)}</div></td><td>${esc(p.category)}</td><td>${p.hasToken ? '<span class="ok">Mil gaya</span>' : '<span class="bad">Nahi</span>'}</td><td class="muted">${esc(p.source)}</td><td><button class="alt" data-sync="${esc(p.id)}" ${p.hasToken ? '' : 'disabled'}>Leads sync</button></td></tr>`).join('')}</table>` : '<p class="muted">Koi page nahi.</p>'}</div>`;
  document.querySelectorAll('[data-sync]').forEach((b) => { b.onclick = guard(async () => { b.disabled = true; b.textContent = 'Sync ho raha hai...'; const r = await api(`/api/pages/${b.dataset.sync}/sync`, 'POST'); toast(`${r.total} conversations mile, ${r.added} naye leads`); b.disabled = false; b.textContent = 'Leads sync'; }); });
}

// ---------- Leads ----------
async function leads() {
  const [list, lbls] = await Promise.all([api('/api/leads'), api('/api/labels')]);
  const pageName = (id) => (state.pages.find((p) => p.id === id) || {}).name || id;
  const view = $('#view');
  view.innerHTML = `<h1>Leads</h1><p class="muted">Wo log jinhon ne aap ke page se kabhi baat ki. Pehle Pages mein "Leads sync" dabayein.</p>
  <div class="card"><div class="row"><select id="fp"><option value="">Saare pages</option>${state.pages.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select>
  <select id="fl"><option value="">Saare labels</option>${lbls.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select><input id="fq" placeholder="Naam search"></div>
  <table id="lt"></table></div>`;
  const draw = () => {
    const p = $('#fp').value, l = $('#fl').value, q = $('#fq').value.toLowerCase();
    const rows = list.filter((x) => (!p || x.pageId === p) && (!l || x.labels.includes(l)) && x.name.toLowerCase().includes(q));
    $('#lt').innerHTML = `<tr><th>Naam</th><th>Page</th><th>Aakhri message</th><th>Labels</th></tr>` + (rows.slice(0, 300).map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(pageName(x.pageId))}</td><td class="muted">${esc(ago(x.lastMessageAt))}</td><td>${x.labels.map((id) => { const lb = lbls.find((z) => z.id === id); return lb ? `<span class="chip" style="background:${lb.color}" data-rm="${esc(x.id)}|${id}" title="Hatane ke liye click">${esc(lb.name)} ×</span>` : ''; }).join('')}<select data-add="${esc(x.id)}"><option value="">+ label</option>${lbls.filter((lb) => !x.labels.includes(lb.id)).map((lb) => `<option value="${lb.id}">${esc(lb.name)}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="4" class="muted">Koi lead nahi.</td></tr>');
    document.querySelectorAll('[data-add]').forEach((s) => { s.onchange = guard(async () => { if (!s.value) return; const x = list.find((z) => z.id === s.dataset.add); x.labels = (await api(`/api/leads/${x.id}/labels`, 'POST', { labels: [...x.labels, s.value] })).labels; draw(); }); });
    document.querySelectorAll('[data-rm]').forEach((c) => { c.onclick = guard(async () => { const [lid, lab] = c.dataset.rm.split('|'); const x = list.find((z) => z.id === lid); x.labels = (await api(`/api/leads/${x.id}/labels`, 'POST', { labels: x.labels.filter((i) => i !== lab) })).labels; draw(); }); });
  };
  ['fp', 'fl'].forEach((i) => { $('#' + i).onchange = draw; }); $('#fq').oninput = draw; draw();
}

// ---------- Labels ----------
async function labels() {
  const list = await api('/api/labels');
  $('#view').innerHTML = `<h1>Labels</h1><div class="card"><div class="row"><input id="ln" placeholder="Label ka naam"><input id="lc" type="color" value="#4f5bd5"><button id="la">Add</button></div></div>
  <div class="card">${list.length ? list.map((l) => `<div class="row" style="justify-content:space-between;padding:6px 0"><span class="chip" style="background:${l.color};cursor:default">${esc(l.name)}</span><button class="danger" data-del="${l.id}">Delete</button></div>`).join('') : '<p class="muted">Abhi koi label nahi.</p>'}</div>`;
  $('#la').onclick = guard(async () => { await api('/api/labels', 'POST', { name: $('#ln').value, color: $('#lc').value }); labels(); });
  document.querySelectorAll('[data-del]').forEach((b) => { b.onclick = guard(async () => { await api(`/api/labels/${b.dataset.del}`, 'DELETE'); labels(); }); });
}

// ---------- Inbox ----------
async function inbox() {
  const v = $('#view');
  v.innerHTML = `<h1>Inbox</h1>${connectBox()}<div class="card"><div class="row"><select id="ip">${state.pages.filter((p) => p.hasToken).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><button id="il">Load conversations</button></div></div>
  <div class="inbox"><div class="card" style="margin:0;padding:0;max-height:480px;overflow:auto" id="ic"><p class="muted" style="padding:12px">Page chun kar Load dabayein.</p></div>
  <div class="card" style="margin:0"><div class="thread" id="it"><p class="muted">Conversation chunein.</p></div>
  <div class="row" style="margin-top:8px"><select id="itag">${tagOptions('RESPONSE')}</select></div>
  <div class="row" style="margin-top:8px"><textarea id="ix" style="min-height:60px;flex:1" placeholder="Jawab likhein..."></textarea><button id="is" disabled>Send</button></div>
  <p class="muted">24 ghante ke baad jawab dene ke liye "Human agent" tag chunein (sirf support jawab, promotion nahi).</p></div></div>`;
  let current = null, pageId = null;
  $('#il').onclick = guard(async () => {
    pageId = $('#ip').value; if (!pageId) throw new Error('Pehle koi page connect karein');
    $('#ic').innerHTML = '<p class="muted" style="padding:12px">Load ho raha hai...</p>';
    const list = await api(`/api/pages/${pageId}/conversations`);
    $('#ic').innerHTML = list.map((c) => `<div class="conv" data-c="${esc(c.id)}"><b>${esc(c.name)}</b><div class="muted">${esc((c.snippet || '').slice(0, 60))}</div><div class="muted">${esc(ago(c.lastMessageAt))}</div></div>`).join('') || '<p class="muted" style="padding:12px">Koi conversation nahi.</p>';
    document.querySelectorAll('.conv').forEach((el) => { el.onclick = guard(async () => {
      document.querySelectorAll('.conv').forEach((x) => x.classList.remove('on')); el.classList.add('on');
      current = list.find((c) => c.id === el.dataset.c);
      const msgs = await api(`/api/pages/${pageId}/conversations/${encodeURIComponent(current.conversationId)}/messages`);
      $('#it').innerHTML = msgs.map((m) => `<div class="msg ${m.mine ? 'mine' : ''}">${esc(m.text)}</div>`).join('') || '<p class="muted">Koi message nahi.</p>';
      $('#it').scrollTop = 1e9; $('#is').disabled = false;
    }); });
  });
  $('#is').onclick = guard(async () => {
    const text = $('#ix').value.trim(); if (!text || !current) return;
    await api('/api/inbox/send', 'POST', { pageId, psid: current.psid, text, tag: $('#itag').value });
    $('#it').insertAdjacentHTML('beforeend', `<div class="msg mine">${esc(text)}</div>`); $('#ix').value = ''; $('#it').scrollTop = 1e9; toast('Bhej diya');
  });
}

// ---------- Library ----------
async function library() {
  const [list, starters] = await Promise.all([api('/api/templates'), api('/api/starters')]);
  $('#view').innerHTML = `<h1>Library</h1><p class="muted"><code>%name%</code> = har banda ka poora Facebook naam, <code>{name}</code> = sirf pehla naam, <code>{page}</code> = page ka naam.</p>
  <div class="card"><label>Tayyar template se shuru karein (phir edit kar sakte hain)</label><select id="st"><option value="">-- chunein --</option>${starters.map((x) => `<option value="${x.id}">${esc(x.name)} (${esc(TAG_NAMES[x.tag])})</option>`).join('')}</select>
  <label>Template ka naam</label><input id="tn" style="width:300px"><label>Message</label><textarea id="tx" placeholder="Hi %name%, your order has been dispatched."></textarea><button class="alt" id="tn2" type="button" style="margin-top:6px">Insert name (%name%)</button>
  <label>Tag</label><select id="tt">${tagOptions('POST_PURCHASE_UPDATE', true)}</select><div class="warn" style="margin-top:10px">Message Tags mein promotion, offer ya sale ka message allowed nahi. Sirf order, booking ya account se juday updates.</div>
  <div style="margin-top:10px"><button id="ts">Save template</button></div></div>
  ${list.map((t) => `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(t.name)}</b><span class="pill">${esc(TAG_NAMES[t.tag] || t.tag)}</span></div><p style="white-space:pre-wrap">${esc(t.text)}</p><button class="danger" data-del="${t.id}">Delete</button></div>`).join('')}`;
  $('#st').onchange = () => { const x = starters.find((z) => z.id === $('#st').value); if (!x) return; $('#tn').value = x.name; $('#tx').value = x.text; $('#tt').value = x.tag; };
  $('#tn2').onclick = () => insertAtCursor($('#tx'), '%name%');
  $('#ts').onclick = guard(async () => { await api('/api/templates', 'POST', { name: $('#tn').value, text: $('#tx').value, tag: $('#tt').value }); library(); });
  document.querySelectorAll('[data-del]').forEach((b) => { b.onclick = guard(async () => { await api(`/api/templates/${b.dataset.del}`, 'DELETE'); library(); }); });
}

// ---------- Campaigns ----------
async function campaigns() {
  const [tpls, starters, lbls, list, ls] = await Promise.all([api('/api/templates'), api('/api/starters'), api('/api/labels'), api('/api/campaigns'), api('/api/leads')]);
  const v = $('#view');
  v.innerHTML = `<h1>Bulk Campaigns</h1>${connectBox()}
  <div class="card"><div class="warn">Sirf unhi logon ko bhejein jinhon ne aap ke page se baat ki ho, aur Tag ke hisaab se kaam ka message. Promotion bhejne par Facebook page ya app band kar sakta hai. Development mode mein messages sirf app ke admin/tester ko pahunchte hain.</div>
  <label>Campaign ka naam</label><input id="cn" style="width:300px">
  <label>Pages chunein <a href="#" id="call" class="muted">(sab select/clear)</a></label><div id="cp" class="card" style="margin:0;max-height:180px;overflow:auto">${state.pages.filter((p) => p.hasToken).map((p) => `<label style="display:flex;gap:8px;align-items:center;margin:4px 0;color:var(--text)"><input type="checkbox" value="${esc(p.id)}"> ${esc(p.name)}</label>`).join('') || '<span class="muted">Pehle Pages mein connect karein.</span>'}</div>
  <label>Template (apne ya tayyar)</label><select id="ct"><option value="">-- khud likhein --</option>${tpls.length ? `<optgroup label="Meri templates">${tpls.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Tayyar templates">${starters.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup></select>
  <label>Tag</label><select id="cg">${tagOptions('POST_PURCHASE_UPDATE', true)}</select>
  <label>Message (yahin edit kar sakte hain)</label><textarea id="cx" placeholder="Hi %name%, ..."></textarea>
  <div class="row" style="margin-top:6px"><button class="alt" id="cnm" type="button">Insert name (%name%)</button><span class="muted">Har banda ko uska Facebook naam lag kar jayega.</span></div>
  <p class="muted" id="cpv"></p>
  <label>Audience</label><select id="cl"><option value="">Is page ke saare leads</option>${lbls.map((l) => `<option value="${l.id}">Label: ${esc(l.name)}</option>`).join('')}</select>
  <p class="muted" id="cc"></p><button id="cs">Campaign shuru karein</button></div>
  <div class="card"><h3>Campaigns</h3><table id="ct2"></table></div>`;
  const picked = () => [...document.querySelectorAll('#cp input:checked')].map((i) => i.value);
  const count = () => { const p = picked(), l = $('#cl').value; $('#cc').textContent = `${ls.filter((x) => p.includes(x.pageId) && (!l || x.labels.includes(l))).length} leads ko jayega (${p.length} pages)`; };
  $('#cp').onchange = count; $('#cl').onchange = count; count();
  $('#call').onclick = (e) => { e.preventDefault(); const boxes = document.querySelectorAll('#cp input'); const all = [...boxes].every((b) => b.checked); boxes.forEach((b) => { b.checked = !all; }); count(); };
  const sample = () => (ls.find((x) => picked().includes(x.pageId)) || { name: 'Ali Khan' }).name;
  const preview = () => { $('#cpv').textContent = $('#cx').value ? `Preview: ${$('#cx').value.replace(/%name%|\{fullname\}/gi, sample()).replace(/\{name\}/gi, sample().split(' ')[0]).replace(/\{page\}|%page%/gi, '(page ka naam)')}` : ''; };
  $('#ct').onchange = () => { const x = [...tpls, ...starters].find((t) => t.id === $('#ct').value); if (!x) return; $('#cx').value = x.text; $('#cg').value = x.tag; preview(); };
  $('#cx').oninput = preview; $('#cnm').onclick = () => insertAtCursor($('#cx'), '%name%'); $('#cp').addEventListener('change', preview);
  $('#cs').onclick = guard(async () => {
    const n = $('#cc').textContent.split(' ')[0];
    if (!$('#cx').value.trim()) throw new Error('Message likhein');
    if (/\[[^\]]*\]/.test($('#cx').value) && !confirm('Message mein [ ] wali jagah abhi bhari nahi gayi. Phir bhi bhejna hai?')) return;
    if (!confirm(`${n} logon ko "${$('#cg').selectedOptions[0].text}" tag ke saath message jayega. Pakka bhejna hai?`)) return;
    await api('/api/campaigns', 'POST', { name: $('#cn').value, pageIds: picked(), templateId: $('#ct').value || null, text: $('#cx').value, tag: $('#cg').value, labelId: $('#cl').value || null });
    toast('Campaign shuru ho gaya'); campaigns();
  });
  const draw = (rows) => {
    $('#ct2').innerHTML = `<tr><th>Naam</th><th>Page</th><th>Status</th><th>Progress</th><th>Sent / Failed</th><th></th></tr>` + (rows.map((c) => `<tr><td>${esc(c.name)}<div class="muted">${esc(ago(c.createdAt))}</div></td><td>${esc(c.pageName)}</td><td>${esc(c.status)}</td><td><div class="bar"><i style="width:${c.total ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0}%"></i></div></td><td><span class="ok">${c.sent}</span> / <span class="bad">${c.failed}</span> of ${c.total}</td><td>${c.status === 'running' ? `<button class="danger" data-cx="${c.id}">Rokein</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Abhi koi campaign nahi.</td></tr>');
    document.querySelectorAll('[data-cx]').forEach((b) => { b.onclick = guard(async () => { await api(`/api/campaigns/${b.dataset.cx}/cancel`, 'POST'); toast('Rok rahe hain...'); }); });
  };
  draw(list);
  if (list.some((c) => c.status === 'running')) pollTimer = setInterval(guard(async () => { const r = await api('/api/campaigns'); draw(r); if (!r.some((c) => c.status === 'running')) clearInterval(pollTimer); }), 2000);
}

// ---------- Logs ----------
async function logs() {
  const list = await api('/api/logs');
  $('#view').innerHTML = `<h1>Logs</h1><div class="card"><table><tr><th>Waqt</th><th>Type</th><th>Page</th><th>Lead</th><th>Status</th><th>Detail</th></tr>${list.map((l) => `<tr><td class="muted">${esc(ago(l.time))}</td><td>${esc(l.kind)}</td><td>${esc(l.pageName)}</td><td>${esc(l.leadName)}</td><td class="${l.status === 'sent' ? 'ok' : 'bad'}">${esc(l.status)}</td><td class="muted">${esc(l.error || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Abhi koi log nahi.</td></tr>'}</table></div>`;
}

route();
