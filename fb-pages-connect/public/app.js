const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const TAG_NAMES = {
  RESPONSE: 'Standard reply (within 24 hours)',
  POST_PURCHASE_UPDATE: 'Post-purchase update (order, payment, delivery)',
  CONFIRMED_EVENT_UPDATE: 'Confirmed event update (booking, appointment)',
  ACCOUNT_UPDATE: 'Account update (request or application status)',
  HUMAN_AGENT: 'Human agent (support reply, up to 7 days)',
};
const tagOptions = (sel, skipResponse) => Object.entries(TAG_NAMES).filter(([k]) => !(skipResponse && k === 'RESPONSE'))
  .map(([k, v]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${esc(v)}</option>`).join('');
const when = (iso) => (iso ? new Date(iso).toLocaleString() : '-');
const AVATAR = (p) => (p.picture && p.picture.data ? `<img class="avatar" src="${esc(p.picture.data.url)}" alt="">` : '');

let state = null;
let pollTimer = null;

async function api(path, method = 'GET', body) {
  const opts = { method, headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' } };
  if (method !== 'GET') opts.body = JSON.stringify(body || {});
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(() => { t.style.display = 'none'; }, 6000); }
const guard = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } };
function insertAtCursor(el, text) { const a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a; el.value = el.value.slice(0, a) + text + el.value.slice(b); el.focus(); el.selectionStart = el.selectionEnd = a + text.length; el.dispatchEvent(new Event('input')); }

const VIEWS = { dashboard, pages, leads, labels, inbox, library, campaigns, logs };
const NAMES = { dashboard: 'Dashboard', pages: 'Pages', leads: 'Leads', labels: 'Labels', inbox: 'Inbox', library: 'Library', campaigns: 'Order & Booking Updates', logs: 'Logs' };

async function route() {
  clearInterval(pollTimer);
  const [h, arg] = location.hash.slice(1).split('/');
  const name = VIEWS[h] ? h : 'dashboard';
  $('#nav').innerHTML = Object.entries(NAMES).map(([k, v]) => `<a href="#${k}" class="${k === name ? 'on' : ''}">${v}</a>`).join('')
    + '<hr><a href="/privacy" target="_blank">Privacy Policy</a><a href="/terms" target="_blank">Terms</a><a href="/data-deletion" target="_blank">Data deletion</a>' + (state && state.authEnabled ? '<a href="/logout">Log out</a>' : '');
  try {
    state = await api('/api/state');
    $('#who').textContent = state.user ? `Connected as ${state.user.name}` : 'Facebook not connected';
    $('#sent').textContent = `${state.stats.sentThisMonth} messages this month`;
    await VIEWS[name](arg);
  } catch (e) { $('#view').innerHTML = `<div class="card bad">${esc(e.message)}</div>`; }
}
window.addEventListener('hashchange', route);

const configWarning = () => (state.configured ? '' : '<div class="card warn"><b>Setup incomplete.</b> Fill in FB_APP_ID, FB_APP_SECRET and FB_REDIRECT_URI in the .env file (see README), then restart the server.</div>');

// ---------- Dashboard ----------
async function dashboard() {
  const s = state.stats;
  const stat = (label, n, sub) => `<div class="card stat"><div class="muted">${label}</div><div class="n">${n}</div><div class="muted">${sub}</div></div>`;
  $('#view').innerHTML = `<h1>Dashboard</h1><p class="muted">A quick look at your Pages and the updates you send to customers.</p>${configWarning()}
  <div class="grid">${stat('Messages sent', s.sentThisMonth, 'this month')}${stat('Customers', s.leads, 'across all Pages')}${stat('Pages connected', s.pages, 'total')}${stat('Templates', s.templates, 'in your Library')}</div>
  <div class="card"><div class="row" style="justify-content:space-between"><h3>Connected Pages</h3><a class="btn alt" href="#pages">All Pages</a></div>
  ${state.pages.length ? state.pages.map((p) => `<span style="display:inline-block;margin:4px 14px 4px 0">${AVATAR(p)}${esc(p.name)}</span>`).join('') : `<p class="muted">No Pages connected yet.</p>${state.configured ? '<a class="btn" href="/auth/facebook">Connect Facebook Pages</a>' : ''}`}</div>
  <div class="card"><h3>Recent updates sent</h3>${state.campaigns.length ? `<table><tr><th>Name</th><th>Pages</th><th>Status</th><th>Sent</th></tr>${state.campaigns.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.pageName)}</td><td>${esc(c.status)}</td><td>${c.sent}/${c.total}</td></tr>`).join('')}</table>` : '<p class="muted">Nothing sent yet.</p>'}</div>`;
}

// ---------- Pages ----------
async function pages() {
  const counts = {}; (await api('/api/leads')).forEach((l) => { counts[l.pageId] = (counts[l.pageId] || 0) + 1; });
  $('#view').innerHTML = `<h1>Pages</h1>${configWarning()}
  <div class="card"><div class="row">${state.configured ? `<a class="btn" href="/auth/facebook">${state.user ? 'Reconnect / refresh Pages' : 'Connect with Facebook'}</a>` : ''}${state.user ? '<a class="btn alt" href="/auth/logout">Disconnect</a>' : ''}</div>
  <p class="muted">In the Facebook popup, select all the Pages you want to manage. Pages that are not selected will not appear here.</p></div>
  <div class="card"><h3>Permissions</h3><p id="perm" class="muted">Checking...</p></div>
  <div class="card"><h3>Total Pages: ${state.pages.length}</h3>${state.pages.length ? `<table><tr><th>Page</th><th>Category</th><th>Customers</th><th>Page token</th><th>Source</th><th></th></tr>${state.pages.map((p) => `<tr><td>${AVATAR(p)}<b>${esc(p.name)}</b><div class="muted">ID: ${esc(p.id)}</div></td><td>${esc(p.category)}</td><td><b>${counts[p.id] || 0}</b></td><td>${p.hasToken ? '<span class="ok">Available</span>' : '<span class="bad">Missing</span>'}</td><td class="muted">${esc(p.source)}</td><td style="white-space:nowrap"><button class="alt" data-sync="${esc(p.id)}" ${p.hasToken ? '' : 'disabled'}>Sync customers</button> <a class="btn" href="#inbox/${esc(p.id)}" ${p.hasToken ? '' : 'style="pointer-events:none;opacity:.5"'}>Messages</a></td></tr>`).join('')}</table>` : '<p class="muted">No Pages found.</p>'}</div>`;
  api('/api/permissions').then((r) => {
    const miss = ['pages_show_list', 'pages_messaging', 'pages_manage_metadata'].filter((n) => !r.granted.includes(n));
    $('#perm').innerHTML = `Granted: ${r.granted.map(esc).join(', ') || 'none'}${miss.length ? `<br><span class="bad">Missing: ${miss.map(esc).join(', ')}</span>. Add them to your login configuration in Meta, then reconnect.` : '<br><span class="ok">All required permissions granted.</span>'}`;
  }).catch((e) => { $('#perm').textContent = e.message; });
  document.querySelectorAll('[data-sync]').forEach((b) => { b.onclick = guard(async () => {
    b.disabled = true; b.textContent = 'Syncing...';
    let r; try { r = await api(`/api/pages/${b.dataset.sync}/sync`, 'POST'); } catch (e) { b.disabled = false; b.textContent = 'Sync customers'; throw e; }
    toast(r.total ? `${r.total} conversations found, ${r.added} new customers.` : 'No conversations found. While the app is in Development mode, Meta only returns conversations with people who have a role on the app (admin, developer, tester). Real customers need Advanced Access to pages_messaging.');
    pages();
  }); });
}

// ---------- Leads ----------
async function leads() {
  const [list, lbls] = await Promise.all([api('/api/leads'), api('/api/labels')]);
  const pageName = (id) => (state.pages.find((p) => p.id === id) || {}).name || id;
  $('#view').innerHTML = `<h1>Leads</h1><p class="muted">People who have messaged your Pages. To send an order or booking update, add the order/booking reference for that person. People who reply STOP are excluded automatically.</p>
  <div class="card"><div class="row"><select id="fp"><option value="">All Pages</option>${state.pages.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select>
  <select id="fl"><option value="">All labels</option>${lbls.map((l) => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select><input id="fq" placeholder="Search by name"></div>
  <div style="overflow-x:auto"><table id="lt"></table></div></div>`;
  const draw = () => {
    const p = $('#fp').value, l = $('#fl').value, q = $('#fq').value.toLowerCase();
    const rows = list.filter((x) => (!p || x.pageId === p) && (!l || x.labels.includes(l)) && x.name.toLowerCase().includes(q));
    $('#lt').innerHTML = '<tr><th>Name</th><th>Page</th><th>Last message</th><th>Order / booking ref</th><th>Opted out</th><th>Labels</th></tr>' + (rows.slice(0, 300).map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(pageName(x.pageId))}</td><td class="muted">${esc(when(x.lastMessageAt))}</td>
      <td><input data-ref="${esc(x.id)}" value="${esc(x.ref || '')}" placeholder="e.g. #1042" size="12"></td>
      <td><input type="checkbox" data-opt="${esc(x.id)}" ${x.optOut ? 'checked' : ''}></td>
      <td>${x.labels.map((id) => { const lb = lbls.find((z) => z.id === id); return lb ? `<span class="chip" style="background:${lb.color}" data-rm="${esc(x.id)}|${id}" title="Click to remove">${esc(lb.name)} ×</span>` : ''; }).join('')}<select data-add="${esc(x.id)}"><option value="">+ label</option>${lbls.filter((lb) => !x.labels.includes(lb.id)).map((lb) => `<option value="${lb.id}">${esc(lb.name)}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="6" class="muted">No customers yet. Use "Sync customers" on the Pages screen.</td></tr>');
    document.querySelectorAll('[data-ref]').forEach((i) => { i.onchange = guard(async () => { const x = list.find((z) => z.id === i.dataset.ref); x.ref = (await api(`/api/leads/${x.id}`, 'POST', { ref: i.value })).ref; toast('Saved'); }); });
    document.querySelectorAll('[data-opt]').forEach((i) => { i.onchange = guard(async () => { const x = list.find((z) => z.id === i.dataset.opt); x.optOut = (await api(`/api/leads/${x.id}`, 'POST', { optOut: i.checked })).optOut; }); });
    document.querySelectorAll('[data-add]').forEach((s) => { s.onchange = guard(async () => { if (!s.value) return; const x = list.find((z) => z.id === s.dataset.add); x.labels = (await api(`/api/leads/${x.id}/labels`, 'POST', { labels: [...x.labels, s.value] })).labels; draw(); }); });
    document.querySelectorAll('[data-rm]').forEach((c) => { c.onclick = guard(async () => { const [lid, lab] = c.dataset.rm.split('|'); const x = list.find((z) => z.id === lid); x.labels = (await api(`/api/leads/${x.id}/labels`, 'POST', { labels: x.labels.filter((i) => i !== lab) })).labels; draw(); }); });
  };
  ['fp', 'fl'].forEach((i) => { $('#' + i).onchange = draw; }); $('#fq').oninput = draw; draw();
}

// ---------- Labels ----------
async function labels() {
  const list = await api('/api/labels');
  $('#view').innerHTML = `<h1>Labels</h1><div class="card"><div class="row"><input id="ln" placeholder="Label name"><input id="lc" type="color" value="#4f5bd5"><button id="la">Add label</button></div></div>
  <div class="card">${list.length ? list.map((l) => `<div class="row" style="justify-content:space-between;padding:6px 0"><span class="chip" style="background:${l.color};cursor:default">${esc(l.name)}</span><button class="danger" data-del="${l.id}">Delete</button></div>`).join('') : '<p class="muted">No labels yet.</p>'}</div>`;
  $('#la').onclick = guard(async () => { await api('/api/labels', 'POST', { name: $('#ln').value, color: $('#lc').value }); labels(); });
  document.querySelectorAll('[data-del]').forEach((b) => { b.onclick = guard(async () => { await api(`/api/labels/${b.dataset.del}`, 'DELETE'); labels(); }); });
}

// ---------- Inbox ----------
async function inbox(arg) {
  $('#view').innerHTML = `<h1>Inbox</h1>${configWarning()}<div class="card"><div class="row"><select id="ip">${state.pages.filter((p) => p.hasToken).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><button id="il">Load conversations</button></div></div>
  <div class="inbox"><div class="card" style="margin:0;padding:0;max-height:480px;overflow:auto" id="ic"><p class="muted" style="padding:12px">Choose a Page and load its conversations.</p></div>
  <div class="card" style="margin:0"><div class="thread" id="it"><p class="muted">Select a conversation.</p></div>
  <div class="row" style="margin-top:8px"><select id="itag">${tagOptions('RESPONSE')}</select></div>
  <div class="row" style="margin-top:8px"><textarea id="ix" style="min-height:60px;flex:1" placeholder="Write a reply..."></textarea><button id="is" disabled>Send</button></div>
  <p class="muted">Replies within 24 hours of the customer's last message use "Standard reply". Later replies need a matching tag and must not be promotional.</p></div></div>`;
  let current = null, pageId = null;
  if (arg && state.pages.some((p) => p.id === arg)) { $('#ip').value = arg; setTimeout(() => $('#il').click(), 0); }
  $('#il').onclick = guard(async () => {
    pageId = $('#ip').value; if (!pageId) throw new Error('Connect a Page first');
    $('#ic').innerHTML = '<p class="muted" style="padding:12px">Loading...</p>';
    const list = await api(`/api/pages/${pageId}/conversations`);
    $('#ic').innerHTML = list.map((c) => `<div class="conv" data-c="${esc(c.id)}"><b>${esc(c.name)}</b><div class="muted">${esc((c.snippet || '').slice(0, 60))}</div><div class="muted">${esc(when(c.lastMessageAt))}</div></div>`).join('') || '<p class="muted" style="padding:12px">No conversations.</p>';
    document.querySelectorAll('.conv').forEach((el) => { el.onclick = guard(async () => {
      document.querySelectorAll('.conv').forEach((x) => x.classList.remove('on')); el.classList.add('on');
      current = list.find((c) => c.id === el.dataset.c);
      const msgs = await api(`/api/pages/${pageId}/conversations/${encodeURIComponent(current.conversationId)}/messages`);
      $('#it').innerHTML = msgs.map((m) => `<div class="msg ${m.mine ? 'mine' : ''}">${esc(m.text)}</div>`).join('') || '<p class="muted">No messages.</p>';
      $('#it').scrollTop = 1e9; $('#is').disabled = false;
    }); });
  });
  $('#is').onclick = guard(async () => {
    const text = $('#ix').value.trim(); if (!text || !current) return;
    await api('/api/inbox/send', 'POST', { pageId, psid: current.psid, text, tag: $('#itag').value });
    $('#it').insertAdjacentHTML('beforeend', `<div class="msg mine">${esc(text)}</div>`); $('#ix').value = ''; $('#it').scrollTop = 1e9; toast('Sent');
  });
}

// ---------- Library ----------
async function library() {
  const [list, starters] = await Promise.all([api('/api/templates'), api('/api/starters')]);
  $('#view').innerHTML = `<h1>Library</h1><p class="muted">Message templates. Placeholders: <code>%name%</code> = the customer's full Facebook name, <code>{name}</code> = first name only, <code>%ref%</code> = their order/booking reference, <code>{page}</code> = the Page name.</p>
  <div class="card"><label>Start from a ready-made template (you can edit it)</label><select id="st"><option value="">-- choose --</option>${starters.map((x) => `<option value="${x.id}">${esc(x.name)} (${esc(TAG_NAMES[x.tag])})</option>`).join('')}</select>
  <label>Template name</label><input id="tn" style="width:300px"><label>Message</label><textarea id="tx" placeholder="Hi %name%, your order %ref% has been dispatched."></textarea>
  <div class="row" style="margin-top:6px"><button class="alt" id="in1" type="button">Insert name</button><button class="alt" id="in2" type="button">Insert order/booking ref</button></div>
  <label>Tag</label><select id="tt">${tagOptions('POST_PURCHASE_UPDATE', true)}</select>
  <div class="warn" style="margin-top:10px">Message Tags are only for updates about something the customer already did: an order, a booking or their account. Promotional messages (sales, discounts, offers) are blocked.</div>
  <div style="margin-top:10px"><button id="ts">Save template</button></div></div>
  ${list.map((t) => `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(t.name)}</b><span class="pill">${esc(TAG_NAMES[t.tag] || t.tag)}</span></div><p style="white-space:pre-wrap">${esc(t.text)}</p><button class="danger" data-del="${t.id}">Delete</button></div>`).join('')}`;
  $('#st').onchange = () => { const x = starters.find((z) => z.id === $('#st').value); if (!x) return; $('#tn').value = x.name; $('#tx').value = x.text; $('#tt').value = x.tag; };
  $('#in1').onclick = () => insertAtCursor($('#tx'), '%name%'); $('#in2').onclick = () => insertAtCursor($('#tx'), '%ref%');
  $('#ts').onclick = guard(async () => { await api('/api/templates', 'POST', { name: $('#tn').value, text: $('#tx').value, tag: $('#tt').value }); library(); });
  document.querySelectorAll('[data-del]').forEach((b) => { b.onclick = guard(async () => { await api(`/api/templates/${b.dataset.del}`, 'DELETE'); library(); }); });
}

// ---------- Order & Booking Updates ----------
async function campaigns() {
  const [tpls, starters, lbls, list, ls] = await Promise.all([api('/api/templates'), api('/api/starters'), api('/api/labels'), api('/api/campaigns'), api('/api/leads')]);
  $('#view').innerHTML = `<h1>Order &amp; Booking Updates</h1>${configWarning()}
  <div class="card"><div class="warn">Send updates only to customers who contacted your Page and have a real order, booking or request. Every message ends with "Reply STOP to stop receiving updates", and people who reply STOP are never messaged again. Promotional content is blocked. While the app is in Development mode, messages are only delivered to people with a role on the app.</div>
  <label>Name</label><input id="cn" style="width:300px" placeholder="e.g. Shipping updates">
  <label>Pages <a href="#" id="call" class="muted">(select / clear all)</a></label><div id="cp" class="card" style="margin:0;max-height:180px;overflow:auto">${state.pages.filter((p) => p.hasToken).map((p) => `<label style="display:flex;gap:8px;align-items:center;margin:4px 0;color:var(--text)"><input type="checkbox" value="${esc(p.id)}"> ${esc(p.name)}</label>`).join('') || '<span class="muted">Connect a Page first.</span>'}</div>
  <label>Template</label><select id="ct"><option value="">-- write my own --</option>${tpls.length ? `<optgroup label="My templates">${tpls.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup>` : ''}<optgroup label="Ready-made templates">${starters.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</optgroup></select>
  <label>Tag</label><select id="cg">${tagOptions('POST_PURCHASE_UPDATE', true)}</select>
  <label>Message (you can edit it here)</label><textarea id="cx" placeholder="Hi %name%, your order %ref% has been dispatched."></textarea>
  <div class="row" style="margin-top:6px"><button class="alt" id="c1" type="button">Insert name</button><button class="alt" id="c2" type="button">Insert order/booking ref</button><span class="muted">%name% becomes each person's Facebook name.</span></div>
  <p class="muted" id="cpv"></p>
  <label>Audience</label><select id="cl"><option value="">All eligible customers on the selected Pages</option>${lbls.map((l) => `<option value="${l.id}">Label: ${esc(l.name)}</option>`).join('')}</select>
  <p class="muted" id="cc"></p><button id="cs">Send updates</button></div>
  <div class="card"><h3>History</h3><div style="overflow-x:auto"><table id="ct2"></table></div></div>`;
  const picked = () => [...document.querySelectorAll('#cp input:checked')].map((i) => i.value);
  const audience = () => { const p = picked(), l = $('#cl').value, human = $('#cg').value === 'HUMAN_AGENT'; return ls.filter((x) => p.includes(x.pageId) && (!l || x.labels.includes(l))).map((x) => ({ x, ok: !x.optOut && (human || !!x.ref) })); };
  const count = () => { const a = audience(), ok = a.filter((i) => i.ok).length; $('#cc').textContent = `${ok} eligible recipient${ok === 1 ? '' : 's'} (${picked().length} Page${picked().length === 1 ? '' : 's'}). ${a.length - ok} skipped: opted out or no order/booking reference.`; };
  const sample = () => (audience().find((i) => i.ok) || { x: { name: 'Ali Khan', ref: '#1042' } }).x;
  const preview = () => { const v = $('#cx').value, s = sample(); $('#cpv').textContent = v ? `Preview: ${v.replace(/%name%|\{fullname\}/gi, s.name).replace(/\{name\}/gi, s.name.split(' ')[0]).replace(/%ref%|\{ref\}/gi, s.ref || '').replace(/\{page\}|%page%/gi, '(Page name)')}\n\nReply STOP to stop receiving updates.` : ''; };
  const refresh = () => { count(); preview(); };
  $('#cp').onchange = refresh; $('#cl').onchange = refresh; $('#cg').onchange = refresh; $('#cx').oninput = preview;
  $('#call').onclick = (e) => { e.preventDefault(); const boxes = document.querySelectorAll('#cp input'); const all = [...boxes].every((b) => b.checked); boxes.forEach((b) => { b.checked = !all; }); refresh(); };
  $('#ct').onchange = () => { const x = [...tpls, ...starters].find((t) => t.id === $('#ct').value); if (!x) return; $('#cx').value = x.text; $('#cg').value = x.tag; refresh(); };
  $('#c1').onclick = () => insertAtCursor($('#cx'), '%name%'); $('#c2').onclick = () => insertAtCursor($('#cx'), '%ref%');
  refresh();
  $('#cs').onclick = guard(async () => {
    const ok = audience().filter((i) => i.ok).length;
    if (!$('#cx').value.trim()) throw new Error('Write a message first');
    if (/\[[^\]]*\]/.test($('#cx').value) && !confirm('The message still contains a [placeholder] that has not been filled in. Send anyway?')) return;
    if (!confirm(`Send this update to ${ok} people using the "${$('#cg').selectedOptions[0].text}" tag?`)) return;
    await api('/api/campaigns', 'POST', { name: $('#cn').value, pageIds: picked(), templateId: $('#ct').value || null, text: $('#cx').value, tag: $('#cg').value, labelId: $('#cl').value || null });
    toast('Sending started'); campaigns();
  });
  const draw = (rows) => {
    $('#ct2').innerHTML = '<tr><th>Name</th><th>Pages</th><th>Status</th><th>Progress</th><th>Sent / Failed</th><th></th></tr>' + (rows.map((c) => `<tr><td>${esc(c.name)}<div class="muted">${esc(when(c.createdAt))}</div></td><td>${esc(c.pageName)}</td><td>${esc(c.status)}${c.lastError ? `<div class="bad" style="font-size:12px;max-width:260px">${esc(c.lastError)}</div>` : ''}</td><td><div class="bar"><i style="width:${c.total ? Math.round(((c.sent + c.failed) / c.total) * 100) : 0}%"></i></div></td><td><span class="ok">${c.sent}</span> / <span class="bad">${c.failed}</span> of ${c.total}</td><td>${c.status === 'running' ? `<button class="danger" data-cx="${c.id}">Stop</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">Nothing sent yet.</td></tr>');
    document.querySelectorAll('[data-cx]').forEach((b) => { b.onclick = guard(async () => { await api(`/api/campaigns/${b.dataset.cx}/cancel`, 'POST'); toast('Stopping...'); }); });
  };
  draw(list);
  if (list.some((c) => c.status === 'running')) pollTimer = setInterval(guard(async () => { const r = await api('/api/campaigns'); draw(r); if (!r.some((c) => c.status === 'running')) clearInterval(pollTimer); }), 2000);
}

// ---------- Logs ----------
async function logs() {
  const list = await api('/api/logs');
  $('#view').innerHTML = `<h1>Logs</h1><div class="card" style="overflow-x:auto"><table><tr><th>Time</th><th>Type</th><th>Page</th><th>Customer</th><th>Status</th><th>Detail</th></tr>${list.map((l) => `<tr><td class="muted">${esc(when(l.time))}</td><td>${esc(l.kind)}</td><td>${esc(l.pageName)}</td><td>${esc(l.leadName)}</td><td class="${l.status === 'sent' ? 'ok' : 'bad'}">${esc(l.status)}</td><td class="muted">${esc(l.error || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="muted">No activity yet.</td></tr>'}</table></div>`;
}

route();
