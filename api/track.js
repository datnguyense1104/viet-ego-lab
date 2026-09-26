// POST /api/track — record one storefront page view for the admin analytics.
// Body: { vid, path, ref }. Country comes from Vercel's edge header; the IP itself is never stored.
import { handler, supabase, text } from "./_supabase.js";

const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit/i;

export default handler("POST", async (body, req) => {
  const ua = String(req.headers["user-agent"] || "");
  const vid = text(body.vid, { max: 64 });
  // Ignore bots and malformed beacons quietly; tracking must never surface errors to shoppers.
  if (!vid || BOT_RE.test(ua)) return { ok: true };

  let referrer = "";
  try {
    const host = new URL(text(body.ref, { max: 500 })).hostname;
    if (host !== req.headers.host) referrer = host;
  } catch {
    /* empty or invalid referrer */
  }

  await supabase("page_views", {
    method: "POST",
    prefer: "return=minimal",
    body: {
      visitor_id: vid,
      path: text(body.path, { max: 200 }) || "/",
      referrer,
      country: text(req.headers["x-vercel-ip-country"], { max: 2 }).toUpperCase(),
      device: /mobi|android|iphone|ipad/i.test(ua) ? "mobile" : "desktop",
    },
  });
  return { ok: true };
});
