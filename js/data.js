// Shared site data + loaders. Content follows the project brief:
// only confirmed product facts are filled in; everything else stays empty and renders as "đang cập nhật".
const BRAND = { name: "VIỆT EGO LAB", tagline: "YOUR SOUL, YOUR SCENT." };

// Stock photos (Unsplash License) are reference images, not product photography.
// Each was checked for third-party brand labels before use.
const unsplash = (id, w = 1000) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;

// Fallback catalog, used until Supabase is configured or if it is unreachable.
// Field meanings: description = short inspiration line; notes/scent_family = confirmed notes only.
const PRODUCTS = [
  {
    id: "com-xanh-ha-noi", name: "Cốm xanh Hà Nội", region: "Hà Nội",
    description: "Lấy cảm hứng từ cốm xanh Hà Nội, tái hiện hương thơm thanh mát, dịu ngọt của lúa non trong một dấu hương đậm bản sắc Việt.",
    price: 890000, size: "100ml",
    img: unsplash("1705899853374-d91c048b81d2"), img2: unsplash("1561504935-4e7d4516a2d1"),
  },
  { id: "sen-dong-thap", name: "Sen Đồng Tháp", region: "Đồng Tháp",
    img: unsplash("1615108395437-df128ad79e80"), img2: unsplash("1538998073820-4dfa76300194") },
  { id: "phu-sa-cuu-long", name: "Phù Sa Cửu Long", region: "Đồng bằng sông Cửu Long",
    img: unsplash("1733660227163-01bc46e0d7d7"), img2: unsplash("1589562337460-9d825d2cd5a2") },
  { id: "hat-ca-phe-tay-nguyen", name: "Hạt cà phê Tây Nguyên", region: "Tây Nguyên",
    img: unsplash("1635796332668-78830169097d"), img2: unsplash("1447933601403-0c6688de566e") },
  { id: "long-tra-da-lat", name: "Long Trà Đà Lạt", region: "Đà Lạt",
    img: unsplash("1594125311687-3b1b3eafa9f4"), img2: unsplash("1764141738717-896b3365c196") },
].map((p, i) => ({
  collection: "", scent_family: "", notes: "", description: "", story: "", usage: "", info: "",
  price: null, size: "", gallery: [], sort_order: i, ...p,
}));

// Journal: four categories from the brief.
const JOURNAL_CATEGORIES = [
  { id: "nghe-thuat-mui-huong", name: "Nghệ thuật mùi hương",
    desc: "Nhóm hương, nốt hương, cách cảm nhận, lựa chọn và sử dụng nước hoa." },
  { id: "huong-viet-va-ky-uc", name: "Hương Việt và ký ức",
    desc: "Những câu chuyện về cốm, sen, lúa non, phù sa, cà phê và các chất liệu gắn với văn hóa, vùng đất Việt Nam." },
  { id: "mui-huong-va-ban-sac", name: "Mùi hương và bản sắc",
    desc: "Mối liên hệ giữa mùi hương, cá tính, cảm xúc và phong cách cá nhân." },
  { id: "nhat-ky-sang-tao", name: "Nhật ký sáng tạo",
    desc: "Cảm hứng, ý tưởng và quá trình sáng tạo sản phẩm của Việt Ego Lab." },
];

// Suggested launch topics from the brief. They are NOT published articles, so they render as
// "Sắp ra mắt" with no body until the team publishes them from /admin.
const ARTICLES = [
  { slug: "neu-viet-nam-co-mot-mui-huong", title: "Nếu Việt Nam có một mùi hương, đó sẽ là gì?",
    category: "huong-viet-va-ky-uc", cover: unsplash("1609412058473-c199497c3c5d") },
  { slug: "com-sen-va-ky-uc-khuu-giac", title: "Cốm, sen và những ký ức được lưu giữ bằng khứu giác",
    category: "huong-viet-va-ky-uc", cover: unsplash("1538998073820-4dfa76300194") },
  { slug: "mui-huong-va-ban-sac-ca-nhan", title: "Mùi hương có thể nói gì về bản sắc cá nhân?",
    category: "mui-huong-va-ban-sac", cover: unsplash("1726067438466-df7db360f4e3") },
  { slug: "mui-huong-va-noi-da-xa", title: "Vì sao có những mùi hương khiến ta nhớ về một nơi đã xa?",
    category: "nghe-thuat-mui-huong", cover: unsplash("1536511671359-849531c0a576") },
  { slug: "lua-chon-mui-huong-phu-hop", title: "Nghệ thuật lựa chọn mùi hương phù hợp với chính mình",
    category: "nghe-thuat-mui-huong", cover: unsplash("1682251008222-412b140cbf4f") },
].map((a, i) => ({ excerpt: "", body: "", read_minutes: null, status: "coming_soon", related_product: null, published_at: null, sort_order: i, ...a }));

const formatPrice = (n) => (n == null ? "Giá đang cập nhật" : Number(n).toLocaleString("vi-VN") + "₫");
const isPurchasable = (p) => p && p.price != null;

/* ---------- Supabase loaders (fall back silently to the lists above) ---------- */
async function fetchTable(path) {
  const { url, anonKey } = typeof SUPABASE_CONFIG === "object" ? SUPABASE_CONFIG : {};
  if (!url || !anonKey) return null;
  try {
    const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Không tải được ${path.split("?")[0]} từ Supabase, dùng dữ liệu có sẵn.`, err);
    return null;
  }
}

async function loadProducts() {
  const rows = await fetchTable("products?select=*&is_active=eq.true&order=sort_order,created_at");
  if (rows?.length) PRODUCTS.splice(0, PRODUCTS.length, ...rows);
}

async function loadArticles() {
  const rows = await fetchTable("articles?select=*&status=in.(coming_soon,published)&order=sort_order,published_at.desc");
  if (rows?.length) ARTICLES.splice(0, ARTICLES.length, ...rows);
}
