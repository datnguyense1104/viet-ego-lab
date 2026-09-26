// Public Supabase settings shared by the storefront and /admin.
// The anon key is designed to be public: Row Level Security in supabase/schema.sql decides
// what it can read or write. NEVER put the service-role key here — it belongs in Vercel env vars.
// Leave empty to run the storefront on the built-in catalog in js/products.js.
const SUPABASE_CONFIG = {
  url: "",
  anonKey: "",
};
