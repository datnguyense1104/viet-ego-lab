# Align website with project brief

Status: phases 1–4 done; phase 5 waits for `brief-alignment.sql` on the live project · Source: Google Doc "BRIEF WEBSITE – VIỆT EGO LAB" (fetched 2026-10-11)

## Decisions
- Multi-page static site; shared header/footer/cart rendered by `js/layout.js`.
- Catalog = the 5 products named in the brief. Only "Cốm xanh Hà Nội" has confirmed price/volume/description; the rest show "đang cập nhật" and cannot be ordered. No invented notes, ingredients, prices.
- Journal: 4 categories + 5 suggested topics shown as "Sắp ra mắt" (brief: topics, not published articles). Articles managed from `/admin` (new `articles` table).
- Scent finder quiz, hero carousel, stores section removed (not in brief).
- Stock photos labelled "Ảnh minh họa" (brief: reference images must be identified).

## Phases
1. Data + SQL migration (`supabase/brief-alignment.sql`): product columns, nullable price, articles table, create_order rejects unpriced products.
2. Shared layout + pages: index, about, products, product, journal, article.
3. Admin: product form fields, Journal tab.
4. Verify: syntax, PGlite migration test, headless screenshots desktop + mobile.
5. Commit/push; deploy after user runs SQL.

## Open questions (for the team)
- Prices/notes/story/usage for the 4 unpriced products.
- Newsletter: brief says only if regular sending is planned — kept with consent text; confirm.
- Bilingual toggle: not built (brief: only if bilingual).
- Brief asks the design side for sitemap, moodboard, wireframe before final UI.
