// GET /admin -> private inbox. Must sit behind Cloudflare Access; the Access JWT is verified here too.
const CATS = ['idea', 'bug', 'love', 'other'];
const LABEL = { idea: 'Idea', bug: 'Bug', love: 'Love it', other: 'Other' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const deny = () => new Response('Forbidden. Turn on Cloudflare Access for /admin and set ACCESS_TEAM and ACCESS_AUD.', { status: 403 });

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

export async function onRequestGet({ request, env }) {
  if (!(await verifyAccess(request, env))) return deny();
  if (!env.DB) return new Response('D1 binding "DB" is missing.', { status: 503 });
  const q = new URL(request.url).searchParams.get('cat');
  const cat = CATS.includes(q) ? q : '';
  const cols = 'SELECT id, category, rating, message, contact, created_at FROM feedback';
  const stmt = cat
    ? env.DB.prepare(cols + ' WHERE category = ?1 ORDER BY id DESC LIMIT 300').bind(cat)
    : env.DB.prepare(cols + ' ORDER BY id DESC LIMIT 300');
  const { results } = await stmt.all();
  const stat = await env.DB.prepare('SELECT COUNT(*) AS n, AVG(rating) AS r FROM feedback').first();

  const when = (t) => new Date(String(t).replace(' ', 'T') + 'Z').toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' });
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
          <input type="hidden" name="id" value="${r.id}">
          <button class="btn" type="submit"><b>Delete</b></button>
        </form>
      </div>
    </article>`).join('') || '<div class="panel fb-item"><p class="fb-item-msg">Nothing here yet.</p></div>';

  const tab = (v, label) => `<a class="btn${cat === v ? ' btn-primary' : ''}" href="${v ? '?cat=' + v : '/admin'}"><b>${label}</b></a>`;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex"><title>Feedback inbox - CoverKit</title>
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
</style></head><body>
<header class="nav"><a class="logo" href="/admin">COVER<span>KIT</span></a><span class="logo small">INBOX</span></header>
<section class="hero"><h1>Feedback inbox</h1><p>${stat.n} message${stat.n === 1 ? '' : 's'}${stat.r ? ' · average ' + Number(stat.r).toFixed(1) + ' stars' : ''}</p></section>
<main class="inbox"><div class="filters">${tab('', 'All')}${CATS.map((c) => tab(c, LABEL[c])).join('')}</div>${items}</main>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ request, env }) {
  if (!(await verifyAccess(request, env))) return deny();
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return new Response('Bad origin', { status: 403 });
  const id = parseInt((await request.formData()).get('id'), 10);
  if (id) await env.DB.prepare('DELETE FROM feedback WHERE id = ?1').bind(id).run();
  return Response.redirect(url.origin + '/admin', 303);
}
