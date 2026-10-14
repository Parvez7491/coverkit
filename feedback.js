// POST /api/feedback  ->  saves a message to D1 (binding: DB)
const CATS = ['idea', 'bug', 'love', 'other'];
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function short(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Feedback is not set up yet.' }, 503);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }

  if (b.website) return json({ ok: true }); // honeypot: bots get a fake success

  const message = String(b.message || '').trim().slice(0, 1000);
  if (message.length < 5) return json({ error: 'Please write a few more words.' }, 400);
  const category = CATS.includes(b.category) ? b.category : 'other';
  const rating = Number.isInteger(b.rating) && b.rating >= 1 && b.rating <= 5 ? b.rating : null;
  const contact = String(b.contact || '').trim().slice(0, 120) || null;
  const ip = request.headers.get('CF-Connecting-IP') || '';

  if (env.TURNSTILE_SECRET) {
    const f = new FormData();
    f.append('secret', env.TURNSTILE_SECRET);
    f.append('response', String(b.token || ''));
    if (ip) f.append('remoteip', ip);
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: f });
    const d = await r.json().catch(() => ({}));
    if (!d.success) return json({ error: 'Spam check failed. Please try again.' }, 400);
  }

  const ipHash = await short(ip + (env.IP_SALT || 'coverkit'));
  const recent = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM feedback WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')"
  ).bind(ipHash).first();
  if (recent && recent.n >= 5) return json({ error: 'Too many messages. Try again in a while.' }, 429);

  await env.DB.prepare(
    'INSERT INTO feedback (category, rating, message, contact, ip_hash, user_agent) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
  ).bind(category, rating, message, contact, ipHash, (request.headers.get('User-Agent') || '').slice(0, 200)).run();

  return json({ ok: true });
}
