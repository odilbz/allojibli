// Cloudflare Worker — يستقبل الطلب ويبعتو لتليجرام (التوكن يبقى مخفي هنا)
// Variables: BOT_TOKEN (Secret), CHAT_ID (Text), ALLOWED_ORIGIN (Text) مثال: https://odilbz.github.io

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const allowed = env.ALLOWED_ORIGIN || '*';
    const cors = {
      'Access-Control-Allow-Origin': allowed,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    const json = (obj, status = 200) =>
      new Response(JSON.stringify(obj), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
    if (allowed !== '*' && origin !== allowed) return json({ ok: false, error: 'origin' }, 403);

    let d;
    try { d = await req.json(); } catch { return json({ ok: false, error: 'bad json' }, 400); }

    const phone = String(d.phone || '').slice(0, 15);
    if (!/^0\d{8,9}$/.test(phone)) return json({ ok: false, error: 'phone' }, 400);
    const order = String(d.order || '').slice(0, 800);
    if (order.length < 3) return json({ ok: false, error: 'order' }, 400);

    const link = p => p && isFinite(p.lat) && isFinite(p.lng)
      ? `https://www.google.com/maps?q=${p.lat},${p.lng}` : null;
    const id = Math.floor(Date.now() / 1000).toString(36).toUpperCase().slice(-5);

    const lines = [
      `🛵 طلب جديد #${id}`,
      '',
      `📞 ${phone}`,
      d.name ? `👤 ${String(d.name).slice(0, 60)}` : null,
      '',
      `🛍 ${order}`,
      '',
      d.addr ? `🏠 ${String(d.addr).slice(0, 200)}` : null,
      link(d.me) ? `📍 موقع الزبون:\n${link(d.me)}` : null,
      link(d.shop) ? `🏪 موقع المحل:\n${link(d.shop)}` : null,
    ].filter(x => x !== null);

    const tg = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.CHAT_ID,
        text: lines.join('\n'),
        disable_web_page_preview: true,
      }),
    });
    if (!tg.ok) return json({ ok: false, error: 'telegram' }, 502);
    return json({ ok: true, id });
  },
};
