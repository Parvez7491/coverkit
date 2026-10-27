// POST /api/downloads -> logs one completed cover download to D1 (binding: DB).
//
// Stored (see README "Privacy"): the cover design (template + color) and, for
// the FIRST submitted-by person only, their name and student ID. Nothing else
// from the cover (course, faculty, group members, dates) is sent or kept.
// A row is "verified" when the name looks real and the ID is a valid 10-digit
// NSU ID; unverified rows (blank/junk) keep only the design. The ranking in
// /admin counts verified rows, one per student per design.
const TEMPLATES = ['classic', 'minimal', 'formal', 'academic', 'frame', 'arch'];
const THEMES = ['mono', 'nsu', 'forest', 'maroon', 'teal'];
const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const clean = (v, n) => String(v == null ? '' : v).trim().replace(/\s+/g, ' ').slice(0, n);

async function short(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].slice(0, 8).map((x) => x.toString(16).padStart(2, '0')).join('');
}

// NSU IDs: 2-digit year + term digit 1-3 + 7 digits (e.g. 2312345678).
function validId(id) {
  const m = /^(\d{2})([1-3])\d{7}$/.exec(id || '');
  if (!m) return false;
  const yy = parseInt(m[1], 10);
  return yy >= 10 && yy <= 40;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: 'Download logging is not set up yet.' }, 503);
  let b;
  try { b = await request.json(); } catch (e) { return json({ error: 'Bad request.' }, 400); }

  const template = TEMPLATES.includes(b.template) ? b.template : 'classic';
  const theme = THEMES.includes(b.theme) ? b.theme : 'mono';
  const name = clean(b.name, 80);
  const studentId = clean(b.studentId, 20);
  const verified = /\p{L}.*\p{L}/u.test(name) && validId(studentId);

  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ipHash = await short(ip + (env.IP_SALT || 'coverkit'));

  try {
    // Generous cap: a whole campus can sit behind one NAT IP.
    const recent = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM downloads WHERE ip_hash = ?1 AND created_at > datetime('now', '-1 hour')"
    ).bind(ipHash).first();
    if (recent && recent.n >= 600) return json({ error: 'Too many downloads.' }, 429);

    await env.DB.prepare(
      'INSERT INTO downloads (template, theme, student_name, student_id, verified, ip_hash) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(template, theme, verified ? name : null, verified ? studentId : null, verified ? 1 : 0, ipHash).run();
  } catch (e) {
    return json({ error: 'Download logging is not set up yet.' }, 503);
  }
  return json({ ok: true });
}
