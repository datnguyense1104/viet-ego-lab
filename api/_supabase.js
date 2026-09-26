// Server-side Supabase access for Vercel Functions (files prefixed with "_" are not routed).
// Uses the service-role key, which must only ever live in Vercel environment variables.
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/** Call Supabase REST (PostgREST). `path` is relative to /rest/v1, e.g. "rpc/create_order". */
export async function supabase(path, { method = "GET", body, prefer } = {}) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new HttpError(500, "Server chưa cấu hình SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = new HttpError(res.status >= 500 ? 502 : 400, data?.message || "Supabase error");
    err.detail = data;
    throw err;
  }
  return data;
}

/** Wrap a handler with method check and uniform JSON errors. */
export function handler(method, fn) {
  return async (req, res) => {
    if (req.method !== method) {
      res.setHeader("Allow", method);
      return res.status(405).json({ error: "Method not allowed" });
    }
    try {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      res.status(200).json(await fn(body, req));
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) console.error(err, err.detail);
      res.status(status).json({ error: status >= 500 ? "Lỗi máy chủ, vui lòng thử lại." : err.message });
    }
  };
}

/** Trimmed string with a max length; throws 400 when required and empty. */
export function text(value, { max = 200, required = false, field = "" } = {}) {
  const s = typeof value === "string" ? value.trim().slice(0, max) : "";
  if (required && !s) throw new HttpError(400, `Thiếu thông tin: ${field}`);
  return s;
}
