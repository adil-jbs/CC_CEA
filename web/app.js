// ===== TIER 1: Cloud Notes page logic =====
// Talks only to /api (proxied by Nginx to the API tier). User text is always
// inserted with textContent, never as HTML.
const $ = (id) => document.getElementById(id);
const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];

let notes = [];        // as returned by the API
let current = null;    // the note open in the editor ({ id: null } = not saved yet)
let saved = null;      // snapshot of current at last save, to detect unsaved changes
let query = '';

// ---------- Theme ----------
const root = document.documentElement;
try { const t = localStorage.getItem('theme'); if (t) root.dataset.theme = t; } catch { }
$('theme').onclick = () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = dark ? 'light' : 'dark';
  try { localStorage.setItem('theme', root.dataset.theme); } catch { }
};

// ---------- API ----------
async function api(path, options = {}) {
  const res = await fetch('/api' + path, { headers: { 'Content-Type': 'application/json' }, ...options });
  if (!res.ok && res.status !== 204) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.status === 204 ? null : res.json();
}

let errorTimer;
function showError(msg) {
  $('error').textContent = msg;
  $('error').classList.add('show');
  clearTimeout(errorTimer);
  errorTimer = setTimeout(() => $('error').classList.remove('show'), 4000);
}

// ---------- Helpers ----------
function timeAgo(ts) {
  if (!ts) return '';
  const date = new Date(ts.replace(' ', 'T') + 'Z');
  const s = Math.max(0, (Date.now() - date) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// Puts text into an element, wrapping search matches in <mark> (no innerHTML with user text).
function setHighlighted(el, text) {
  el.replaceChildren();
  if (!query) { el.textContent = text; return; }
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  let i = 0;
  for (let at = lower.indexOf(q); at !== -1; at = lower.indexOf(q, i)) {
    el.append(text.slice(i, at));
    const m = document.createElement('mark');
    m.textContent = text.slice(at, at + q.length);
    el.append(m);
    i = at + q.length;
  }
  el.append(text.slice(i));
}

function colorVars(el, color) {
  el.style.setProperty('--dot', `var(--${color})`);
  el.style.setProperty('--tint', `var(--${color}-tint)`);
}

const isDirty = () => current && saved &&
  (current.title !== saved.title || current.body !== saved.body || current.color !== saved.color || current.pinned !== saved.pinned);

function confirmDiscard() {
  return !isDirty() || confirm('You have unsaved changes. Discard them?');
}

// ---------- Sidebar ----------
function renderList() {
  const list = $('notes');
  list.replaceChildren();
  const q = query.toLowerCase();
  const shown = notes.filter((n) => !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q));
  $('count').textContent = `${notes.length} note${notes.length === 1 ? '' : 's'}`;

  if (!shown.length) {
    const div = document.createElement('div');
    div.className = 'side-empty';
    div.textContent = notes.length ? `No notes match "${query}".` : 'No notes yet. Click "New note" to write your first one.';
    list.append(div);
    return;
  }

  const groups = [['Pinned', shown.filter((n) => n.pinned)], ['Notes', shown.filter((n) => !n.pinned)]];
  for (const [label, items] of groups) {
    if (!items.length) continue;
    if (groups[0][1].length) {
      const g = document.createElement('div');
      g.className = 'group';
      g.textContent = label;
      list.append(g);
    }
    for (const n of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'item' + (current && current.id === n.id ? ' active' : '');
      colorVars(btn, n.color);

      const top = document.createElement('div');
      top.className = 'item-top';
      const title = document.createElement('span');
      title.className = 'item-title' + (n.title ? '' : ' untitled');
      setHighlighted(title, n.title || 'Untitled');
      top.append(title);
      if (n.pinned) {
        const pin = document.createElement('span');
        pin.className = 'item-pin';
        pin.setAttribute('aria-label', 'Pinned');
        pin.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 4h6v6.76l2.5 3.24H13v7l-1 1-1-1v-7H6.5L9 10.76z"/></svg>';
        top.append(pin);
      }
      const preview = document.createElement('div');
      preview.className = 'item-preview';
      setHighlighted(preview, n.body.replace(/\s+/g, ' ').trim() || 'No text');
      const time = document.createElement('div');
      time.className = 'item-time';
      time.textContent = timeAgo(n.updated_at);

      btn.append(top, preview, time);
      btn.onclick = () => { if (current && current.id === n.id) { openEditor(); return; } if (confirmDiscard()) open(n); };
      list.append(btn);
    }
  }
}

// ---------- Editor ----------
for (const c of COLORS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'swatch';
  b.dataset.color = c;
  b.style.setProperty('--c', `var(--${c})`);
  b.setAttribute('aria-label', c);
  b.title = c[0].toUpperCase() + c.slice(1);
  b.onclick = () => { current.color = c; renderEditor(); };
  $('swatches').append(b);
}

function open(note) {
  current = { ...note };
  saved = { ...note };
  renderEditor();
  renderList();
  openEditor();
}

function openEditor() {
  $('app').classList.add('editing');
}

function renderEditor() {
  const has = Boolean(current);
  $('placeholder').hidden = has;
  $('form').hidden = !has;
  $('form').style.display = has ? 'flex' : 'none';
  if (!has) { $('editor').style.removeProperty('--tint'); return; }

  colorVars($('editor'), current.color);
  if ($('title').value !== current.title) $('title').value = current.title;
  if ($('body').value !== current.body) $('body').value = current.body;
  for (const s of $('swatches').children) s.setAttribute('aria-pressed', String(s.dataset.color === current.color));
  $('pin').setAttribute('aria-pressed', String(current.pinned));
  $('pin').title = current.pinned ? 'Unpin' : 'Pin to top';
  $('delete').hidden = current.id === null;

  const dirty = isDirty() || current.id === null;
  const empty = !current.title.trim() && !current.body.trim();
  $('save').disabled = !dirty || empty;
  $('status').className = 'status' + (dirty ? ' dirty' : '');
  $('status').textContent = current.id === null ? 'New note' : dirty ? 'Unsaved changes' : `Saved · ${timeAgo(current.updated_at)}`;
  $('chars').textContent = `${current.body.length.toLocaleString()} / 10,000 characters`;
}

$('title').oninput = () => { current.title = $('title').value; renderEditor(); };
$('body').oninput = () => { current.body = $('body').value; renderEditor(); };
$('pin').onclick = () => { current.pinned = !current.pinned; renderEditor(); };

async function save() {
  if (!current || $('save').disabled) return;
  $('save').disabled = true;
  const payload = { title: current.title, body: current.body, color: current.color, pinned: current.pinned };
  try {
    const result = current.id === null
      ? await api('/notes', { method: 'POST', body: JSON.stringify(payload) })
      : await api(`/notes/${current.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
    current = { ...result };
    saved = { ...result };
    await load();
  } catch (err) {
    showError(err.message);
  }
  renderEditor();
}
$('save').onclick = save;

$('delete').onclick = async () => {
  if (!current || current.id === null) return;
  if (!confirm(`Delete "${current.title || 'Untitled'}"? This cannot be undone.`)) return;
  try {
    await api(`/notes/${current.id}`, { method: 'DELETE' });
    current = saved = null;
    $('app').classList.remove('editing');
    renderEditor();
    await load();
  } catch (err) { showError(err.message); }
};

$('new').onclick = () => {
  if (!confirmDiscard()) return;
  open({ id: null, title: '', body: '', color: 'yellow', pinned: false });
  $('title').focus();
};

$('back').onclick = () => {
  if (!confirmDiscard()) return;
  if (current && current.id === null) current = saved = null;
  else if (current) current = { ...saved };
  $('app').classList.remove('editing');
  renderEditor();
  renderList();
};

$('search').oninput = () => { query = $('search').value.trim(); renderList(); };

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
});
window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

// ---------- Load ----------
async function load() {
  try {
    notes = await api('/notes');
  } catch {
    showError('Could not reach the API. Please try again in a moment.');
  }
  renderList();
}

load();
setInterval(() => { renderList(); if (current && !isDirty()) renderEditor(); }, 60000); // refresh "x min ago"
