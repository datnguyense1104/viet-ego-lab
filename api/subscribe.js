// POST /api/subscribe — newsletter sign-up. Body: { email }
import { handler, supabase, text, HttpError } from "./_supabase.js";

export default handler("POST", async (body) => {
  const email = text(body.email, { max: 120, required: true, field: "email" }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Email không hợp lệ");
  // Duplicate sign-ups are ignored rather than reported, so emails can't be probed.
  await supabase("subscribers?on_conflict=email", {
    method: "POST",
    body: { email },
    prefer: "resolution=ignore-duplicates,return=minimal",
  });
  return { ok: true };
});
