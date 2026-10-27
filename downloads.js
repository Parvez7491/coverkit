// POST /api/downloads -> counts one completed cover download and (optionally)
// notifies the site owner. Anonymous: only the design (template + color) and
// whether the cover was blank are received. No names, IDs or course details.
//
// Notifications (set secrets in the Cloudflare dashboard; all optional):
//   DISCORD_WEBHOOK                          -> posts to a Discord channel
//   TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID    -> messages you on Telegram
// To avoid flooding your phone: no alert if the same visitor (hashed IP)
// already downloaded in the last 10 minutes, or if 6+ downloads happened in
// the last minute. Everything is still counted in the database.
const TEMPLATES = { classic: 'Classic', minimal: 'Minimal', formal: 'Formal', academic: 'Academic', frame: 'Frame', arch: 'Arch' };
const THEMES = { mono: 'Black & white', nsu: 'NSU blue', forest: 'Forest', maroon: 'Maroon', teal: 'Teal' };
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

async function short(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function notify(env, text) {
  const jobs = [];
  if (env.DISCORD_WEBHOOK) {
    jobs.push(fetch(env.DISCORD_WEBHOOK, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text })
    }));
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    jobs.push(fetch('https://api.telegram.org/bot' + env.TELEGRAM_BOT_TOKEN + '/sendMessage', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
    }));
  }
  await Promise.allSettled(jobs);
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json({ error: 'No database binding named DB on this Worker.' }, 503);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }

  const template = TEMPLATES[b.template] ? b.template : 'classic';
  const theme = THEMES[b.theme] ? b.theme : 'mono';
  const blank = b.blank ? 1 : 0;
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = await short(ip + (env.IP_SALT || 'coverkit'));

  try {
    const hour = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM downloads WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')"
    ).bind(ipHash).first();
    if (hour && hour.n >= 600) return json({ error: 'Too many downloads.' }, 429);

    const repeat = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM downloads WHERE ip_hash = ?1 AND created_at > datetime('now', '-10 minutes')"
    ).bind(ipHash).first();
    const burst = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM downloads WHERE created_at > datetime('now', '-1 minute')"
    ).first();

    await env.DB.prepare('INSERT INTO downloads (template, theme, blank, ip_hash) VALUES (?1, ?2, ?3, ?4)')
      .bind(template, theme, blank, ipHash).run();

    const canNotify = !(repeat && repeat.n > 0) && !(burst && burst.n >= 6);
    if ((env.DISCORD_WEBHOOK || env.TELEGRAM_BOT_TOKEN) && canNotify) {
      const t = await env.DB.prepare(
        "SELECT COUNT(*) AS total, SUM(CASE WHEN date(created_at, '+6 hours') = date('now', '+6 hours') THEN 1 ELSE 0 END) AS today FROM downloads"
      ).first();
      const text = (blank ? '📄 CoverKit: blank cover downloaded' : '🎓 CoverKit: someone just downloaded a cover') +
        '\nDesign: ' + TEMPLATES[template] + ' · ' + THEMES[theme] +
        '\nToday: ' + (t.today || 0) + ' · All time: ' + t.total;
      const job = notify(env, text);
      if (waitUntil) waitUntil(job); else await job;
    }
  } catch (e) {
    return json({ error: 'Database error: ' + String(e && e.message || e).slice(0, 160) }, 503);
  }
  return json({ ok: true });
}
