// Public Supabase settings shared by the storefront and /admin.
// The anon key is designed to be public: Row Level Security in supabase/schema.sql decides
// what it can read or write. NEVER put the service-role key here — it belongs in Vercel env vars.
// Leave empty to run the storefront on the built-in catalog in js/products.js.
const SUPABASE_CONFIG = {
  url: "https://ahwtawfqljdcfpbfjljh.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFod3Rhd2ZxbGpkY2ZwYmZqbGpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA0MjkwMDksImV4cCI6MjEwNjAwNTAwOX0.iAb4VcqSSfwvfK2jugJjuOL4CjyqGEbcsK6YS7qHVUc",
};
