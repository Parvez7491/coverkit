// GET /admin -> private inbox (feedback + download log). Must sit behind
// Cloudflare Access; the Access JWT is verified here too.
// (This file used to be called index.js — renamed to admin.js, see worker.js.)
const CATS = ['idea', 'bug', 'love', 'other'];
const LABEL = { idea: 'Idea', bug: 'Bug', love: 'Love it', other: 'Other' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const deny = () => new Response('Forbidden. Turn on Cloudflare Access for /admin and set ACCESS_TEAM and ACCESS_AUD.', { status: 403 });
const when = (t) => new Date(String(t).replace(' ', 'T') + 'Z').toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });
const like = (s) => '%' + String(s).replace(/[\\%_]/g, (c) => '\\' + c) + '%';

async function verifyAccess(request, env) {
  try {
    const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!jwt || !env.ACCESS_TEAM || !env.ACCESS_AUD) return false;
    const [h, p, s] = jwt.split('.');
    const b64 = (x) => Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const dec = (x) => JSON.parse(new TextDecoder().decode(b64(x)));
    const head = dec(h), claims = dec(p);
    const base = 'https://' + env.ACCESS_TEAM + '.cloudflareaccess.com';
    if (![].concat(claims.aud).includes(env.ACCESS_AUD) || claims.exp < Date.now() / 1000 || claims.iss !== base) return false;
    const certs = await (await fetch(base + '/cdn-cgi/access/certs')).json();
    const jwk = certs.keys.find((k) => k.kid === head.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64(s), new TextEncoder().encode(h + '.' + p));
  } catch (e) { return false; }
}

function shell(title, sub, body, view) {
  const vtab = (v, label) => `<a class="btn${view === v ? ' btn-primary' : ''}" href="${v === 'downloads' ? '/admin?view=downloads' : '/admin'}"><b>${label}</b></a>`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex"><title>${esc(title)} - CoverKit</title>
<script>(function(){var t='light';try{t=localStorage.getItem('coverkit:theme')||'light'}catch(e){}document.documentElement.setAttribute('data-theme',t)})();</script>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<style>
body{height:auto!important;overflow:auto!important}
.inbox{max-width:860px;width:calc(100% - 32px);margin:0 auto 40px;display:grid;gap:16px}
.filters{display:flex;gap:8px;flex-wrap:wrap}
.filters .btn{flex:none;height:38px;padding:0 16px;font-size:19px}
.fb-item{display:grid;gap:10px;animation:rise .4s cubic-bezier(.2,.8,.2,1) both}
.fb-item-top{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.fb-item-top time{margin-left:auto;font-size:13px;color:var(--ph)}
.badge{font:400 18px/1 'Bebas Neue',sans-serif;letter-spacing:.5px;padding:5px 10px;background:var(--tan);color:var(--on-tan);border:2px solid var(--line);border-radius:6px;box-shadow:2px 2px 0 var(--line)}
.stars{color:var(--accent);letter-spacing:2px}
.fb-item-msg{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5;font-size:16px}
.fb-item-foot{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px}
.fb-item .btn{flex:none;height:36px;padding:0 14px;font-size:18px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.stat{text-align:center;padding:18px 10px}
.stat b{display:block;font:400 40px/1 'Bebas Neue',sans-serif;letter-spacing:.5px}
.stat span{font-size:13px;color:var(--ph)}
.breakdown{line-height:1.9;font-size:15px}
.breakdown b{font-family:'Bebas Neue',sans-serif;font-weight:400;letter-spacing:.5px;font-size:19px}
.breakdown a{color:inherit}
.meta-line{font-size:14px;color:var(--ph)}
.file-name{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;overflow-wrap:anywhere}
.search{display:flex;gap:8px}
.search input{flex:1}
.search .btn{flex:none;height:auto;padding:0 18px}
</style></head><body>
<header class="nav"><a class="logo" href="/admin">COVER<span>KIT</span></a><span class="logo small">INBOX</span></header>
<section class="hero"><h1>${esc(title)}</h1><p>${sub}</p></section>
<main class="inbox"><div class="filters">${vtab('feedback', 'Feedback')}${vtab('downloads', 'Downloads')}</div>${body}</main>
</body></html>`;
}

const page = (html) => new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });

async function feedbackView(request, env) {
  const q = new URL(request.url).searchParams.get('cat');
  const cat = CATS.includes(q) ? q : '';
  const cols = 'SELECT id, category, rating, message, contact, created_at FROM feedback';
  const stmt = cat
    ? env.DB.prepare(cols + ' WHERE category = ?1 ORDER BY id DESC LIMIT 300').bind(cat)
    : env.DB.prepare(cols + ' ORDER BY id DESC LIMIT 300');
  const { results } = await stmt.all();
  const stat = await env.DB.prepare('SELECT COUNT(*) AS n, AVG(rating) AS r FROM feedback').first();

  const items = results.map((r) => `
    <article class="panel fb-item">
      <div class="fb-item-top">
        <span class="badge">${esc(LABEL[r.category] || r.category)}</span>
        <span class="stars" aria-label="${r.rating || 0} of 5 stars">${r.rating ? '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating) : ''}</span>
        <time>${esc(when(r.created_at))}</time>
      </div>
      <p class="fb-item-msg">${esc(r.message)}</p>
      <div class="fb-item-foot">
        <span>${r.contact ? esc(r.contact) : ''}</span>
        <form method="post" onsubmit="return confirm('Delete this message?')">
          <input type="hidden" name="kind" value="feedback">
          <input type="hidden" name="id" value="${r.id}">
          <button class="btn" type="submit"><b>Delete</b></button>
        </form>
      </div>
    </article>`).join('') || '<div class="panel fb-item"><p class="fb-item-msg">Nothing here yet.</p></div>';

  const tab = (v, label) => `<a class="btn${cat === v ? ' btn-primary' : ''}" href="${v ? '?cat=' + v : '/admin'}"><b>${label}</b></a>`;
  const body = `<div class="filters">${tab('', 'All')}${CATS.map((c) => tab(c, LABEL[c])).join('')}</div>${items}`;
  const sub = `${stat.n} message${stat.n === 1 ? '' : 's'}${stat.r ? ' · average ' + Number(stat.r).toFixed(1) + ' stars' : ''}`;
  return page(shell('Feedback inbox', sub, body, 'feedback'));
}

const NAMES = { classic: 'Classic', minimal: 'Minimal', formal: 'Formal', academic: 'Academic', frame: 'Frame', arch: 'Arch' };

async function downloadsView(request, env) {
  const q = String(new URL(request.url).searchParams.get('q') || '').trim().slice(0, 60);
  let body = '';
  try {
    const stat = await env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(verified) AS verified,
              COUNT(DISTINCT student_id) AS students,
              SUM(CASE WHEN date(created_at, '+6 hours') = date('now', '+6 hours') THEN 1 ELSE 0 END) AS today
         FROM downloads`
    ).first();
    const rank = (await env.DB.prepare(
      `SELECT template, COUNT(DISTINCT student_id) AS students, SUM(verified) AS verified, COUNT(*) AS total
         FROM downloads GROUP BY template ORDER BY students DESC, verified DESC, total DESC`
    ).all()).results;
    const themes = (await env.DB.prepare(
      `SELECT theme, COUNT(DISTINCT student_id) AS students FROM downloads
        WHERE verified = 1 GROUP BY theme ORDER BY students DESC`
    ).all()).results;

    const cols = 'SELECT id, template, theme, student_name, student_id, verified, created_at FROM downloads';
    const stmt = q
      ? env.DB.prepare(cols + " WHERE student_name LIKE ?1 ESCAPE '\\' OR student_id LIKE ?1 ESCAPE '\\' ORDER BY id DESC LIMIT 300").bind(like(q))
      : env.DB.prepare(cols + ' ORDER BY id DESC LIMIT 300');
    const { results } = await stmt.all();

    const card = (v, label) => `<div class="panel stat"><b>${v == null ? 0 : v}</b><span>${label}</span></div>`;
    const stats = `<div class="stats">${card(stat.total, 'total downloads')}${card(stat.verified, 'verified (real student)')}${card(stat.students, 'unique students')}${card(stat.today, 'today (Dhaka)')}</div>`;

    const rankLines = rank.length
      ? rank.map((r, i) => `${i + 1}. <b>${esc(NAMES[r.template] || r.template)}</b> — ${r.students} student${r.students === 1 ? '' : 's'} · ${r.verified || 0} verified · ${r.total} total`).join('<br>')
      : 'No downloads yet.';
    const themeLine = themes.length ? themes.map((t) => `<b>${esc(t.theme || '—')}</b> × ${t.students}`).join(' &nbsp;·&nbsp; ') : 'None yet.';
    const ranking = `<div class="panel breakdown"><b>Design ranking</b> (one vote per student)<br>${rankLines}<br><br><b>Colors</b> — ${themeLine}</div>`;

    const search = `<form class="search" method="get"><input type="hidden" name="view" value="downloads"><input type="search" name="q" value="${esc(q)}" placeholder="Search name or student ID…" aria-label="Search downloads"><button class="btn btn-primary" type="submit"><b>Search</b></button></form>`;

    const items = results.map((r) => `
    <article class="panel fb-item">
      <div class="fb-item-top">
        <span class="badge">${esc(NAMES[r.template] || r.template)}</span>
        <span class="badge">${esc(r.theme || '—')}</span>
        <time>${esc(when(r.created_at))}</time>
      </div>
      <p class="fb-item-msg">${r.verified ? esc(r.student_name) + ' · ' + esc(r.student_id) : 'Unverified (blank or invalid details)'}</p>
      <div class="fb-item-foot">
        <span class="meta-line">${r.verified ? 'Verified' : 'Not counted in ranking'}</span>
        <form method="post" onsubmit="return confirm('Delete this download record?')">
          <input type="hidden" name="kind" value="downloads">
          <input type="hidden" name="id" value="${r.id}">
          <button class="btn" type="submit"><b>Delete</b></button>
        </form>
      </div>
    </article>`).join('') || '<div class="panel fb-item"><p class="fb-item-msg">No downloads logged yet.</p></div>';

    body = stats + ranking + search + items;
    const sub = `${stat.total} download${stat.total === 1 ? '' : 's'} logged${q ? ' · filtered by “' + esc(q) + '”' : ''}`;
    return page(shell('Download log', sub, body, 'downloads'));
  } catch (e) {
    body = '<div class="panel fb-item"><p class="fb-item-msg">The <b>downloads</b> table is missing or out of date. Run the lean <span class="file-name">schema.sql</span> in the D1 console, then reload.</p></div>';
    return page(shell('Download log', 'Database setup needed', body, 'downloads'));
  }
}

export async function onRequestGet({ request, env }) {
  if (!(await verifyAccess(request, env))) return deny();
  if (!env.DB) return new Response('D1 binding "DB" is missing.', { status: 503 });
  const view = new URL(request.url).searchParams.get('view');
  return view === 'downloads' ? downloadsView(request, env) : feedbackView(request, env);
}

export async function onRequestPost({ request, env }) {
  if (!(await verifyAccess(request, env))) return deny();
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return new Response('Bad origin', { status: 403 });
  const form = await request.formData();
  const kind = form.get('kind') === 'downloads' ? 'downloads' : 'feedback';
  const id = parseInt(form.get('id'), 10);
  if (id) await env.DB.prepare('DELETE FROM ' + kind + ' WHERE id = ?1').bind(id).run();
  return Response.redirect(url.origin + '/admin' + (kind === 'downloads' ? '?view=downloads' : ''), 303);
}
