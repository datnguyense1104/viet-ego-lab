// Product catalog data. Prices are placeholders — update when pricing is final.
// `img` / `img2` are optional image URLs; when empty a styled placeholder is rendered.
// `mood` links a product to an answer in the scent finder (see SCENT_FINDER).
const BRAND = { name: "VIỆT EGO LAB", tagline: "Your Soul – Your Scent" };

const CATEGORIES = [
  { id: "edp", name: "Eau de Parfum", desc: "Mỗi vùng đất một mùi hương — nồng độ cao, lưu hương bền lâu." },
  { id: "edt", name: "Eau de Toilette", desc: "Phiên bản nhẹ nhàng, dễ dùng cho mỗi ngày." },
  { id: "set", name: "Bộ khám phá", desc: "Trải nghiệm trọn hành trình hương Việt trước khi chọn mùi hương của riêng bạn." },
  { id: "home", name: "Hương thơm không gian", desc: "Mang ký ức Việt vào không gian sống." },
];

const PRODUCTS = [
  { id: "edp-com", cat: "edp", name: "Cốm Hà Nội", region: "Hà Nội", mood: "diu-dang",
    notes: "Cốm non · Lá sen · Xạ hương", price: 1290000, size: "50ml", hue: 95,
    story: "Buổi sáng mùa thu Hà Nội — xanh, non, dịu và thanh." },
  { id: "edp-phusa", cat: "edp", name: "Phù Sa Cửu Long", region: "Đồng bằng sông Cửu Long", mood: "am-ap",
    notes: "Đất ẩm · Gỗ tuyết tùng · Hổ phách", price: 1290000, size: "50ml", hue: 30,
    story: "Dòng sông, miền quê và nhịp sống phương Nam — ấm áp, sâu và trầm." },
  { id: "edp-mano", cat: "edp", name: "Mạ Non Sương Sớm", region: "Đồng bằng Bắc Bộ", mood: "trong-treo",
    notes: "Lúa non · Cỏ xanh · Sương mai", price: 1290000, size: "50ml", hue: 110,
    story: "Cánh đồng lúc bình minh — trong trẻo và tươi mới." },
  { id: "edp-caphe", cat: "edp", name: "Cà Phê Tây Nguyên", region: "Tây Nguyên", mood: "manh-me",
    notes: "Cà phê rang · Tiêu đen · Da thuộc", price: 1290000, size: "50ml", hue: 22,
    story: "Buổi sáng trên cao nguyên — mạnh mẽ, ấm và đầy năng lượng." },
  { id: "edp-sen", cat: "edp", name: "Sen Đồng Tháp", region: "Đồng Tháp Mười", mood: "tinh-lang",
    notes: "Hoa sen · Trà trắng · Gỗ đàn hương", price: 1290000, size: "50ml", hue: 340,
    story: "Đầm sen giữa miền quê — thanh tao và tĩnh lặng." },
  { id: "set-01", cat: "set", name: "Hành trình Hương Việt", region: "5 vùng đất", mood: "",
    notes: "5 × 5ml Eau de Parfum", price: 690000, size: "5 × 5ml", hue: 140,
    story: "Thử cả năm mùi hương để tìm ra mùi hương của chính bạn." },
  { id: "edt-com", cat: "edt", name: "Cốm Hà Nội", region: "Hà Nội", mood: "diu-dang",
    notes: "Cốm non · Lá sen · Xạ hương", price: 490000, size: "30ml", hue: 90,
    story: "Phiên bản nhẹ của Cốm Hà Nội cho mỗi ngày." },
  { id: "edt-mano", cat: "edt", name: "Mạ Non Sương Sớm", region: "Đồng bằng Bắc Bộ", mood: "trong-treo",
    notes: "Lúa non · Cỏ xanh · Sương mai", price: 490000, size: "30ml", hue: 115,
    story: "Phiên bản nhẹ của Mạ Non Sương Sớm cho mỗi ngày." },
  { id: "edt-sen", cat: "edt", name: "Sen Đồng Tháp", region: "Đồng Tháp Mười", mood: "tinh-lang",
    notes: "Hoa sen · Trà trắng · Gỗ đàn hương", price: 490000, size: "30ml", hue: 345,
    story: "Phiên bản nhẹ của Sen Đồng Tháp cho mỗi ngày." },
  { id: "edt-caphe", cat: "edt", name: "Cà Phê Tây Nguyên", region: "Tây Nguyên", mood: "manh-me",
    notes: "Cà phê rang · Tiêu đen · Da thuộc", price: 490000, size: "30ml", hue: 25,
    story: "Phiên bản nhẹ của Cà Phê Tây Nguyên cho mỗi ngày." },
  { id: "home-caphe", cat: "home", name: "Nến thơm Cà Phê Tây Nguyên", region: "Tây Nguyên", mood: "",
    notes: "Sáp đậu nành · 45 giờ cháy", price: 450000, size: "200g", hue: 20,
    story: "Hương cà phê ấm áp cho góc làm việc." },
  { id: "home-sen", cat: "home", name: "Tinh dầu khuếch tán Sen", region: "Đồng Tháp Mười", mood: "",
    notes: "Que gỗ tự nhiên", price: 520000, size: "150ml", hue: 335,
    story: "Hương sen thanh tao cho không gian nghỉ ngơi." },
];

// Demo photos from Unsplash (free under the Unsplash License), chosen without third-party
// brand labels. Format: product id -> [bottle photo, mood photo shown on hover].
// Replace with the team's own product shots by setting `img` / `img2` directly.
const unsplash = (id, w = 800) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;
const DEMO_IMAGES = {
  "edp-com": ["1705899853374-d91c048b81d2", "1701070478075-0c81dd3adecf"],
  "edp-phusa": ["1733660227163-01bc46e0d7d7", "1589562337460-9d825d2cd5a2"],
  "edp-mano": ["1594125311687-3b1b3eafa9f4", "1606801954050-be6b29588460"],
  "edp-caphe": ["1635796332668-78830169097d", "1447933601403-0c6688de566e"],
  "edp-sen": ["1615108395437-df128ad79e80", "1538998073820-4dfa76300194"],
  "set-01": ["1705899844877-81bb0a0665c1", "1609412058473-c199497c3c5d"],
  "edt-com": ["1720423514789-15a33e59fc81", "1701070478075-0c81dd3adecf"],
  "edt-mano": ["1709551264866-4573279d4c3e", "1606801954050-be6b29588460"],
  "edt-sen": ["1608721279136-cd41b752fa41", "1616435577207-ca90abc6b732"],
  "edt-caphe": ["1622618991746-fe6004db3a47", "1606791405792-1004f1718d0c"],
  "home-caphe": ["1612293905607-b003de9e54fb", "1524350876685-274059332603"],
  "home-sen": ["1750433101196-604c1741a012", "1616435577207-ca90abc6b732"],
};
PRODUCTS.forEach((p) => {
  const pair = DEMO_IMAGES[p.id];
  if (pair && !p.img) [p.img, p.img2] = pair.map((id) => unsplash(id));
});

// Scent finder: each answer maps to a `mood` value on the Eau de Parfum products.
const SCENT_FINDER = [
  { mood: "diu-dang", label: "Dịu dàng, hoài niệm" },
  { mood: "trong-treo", label: "Trong trẻo, tươi mới" },
  { mood: "am-ap", label: "Ấm áp, gắn bó" },
  { mood: "manh-me", label: "Mạnh mẽ, đầy năng lượng" },
  { mood: "tinh-lang", label: "Thanh tao, tĩnh lặng" },
];

const formatPrice = (n) => n.toLocaleString("vi-VN") + "₫";

// Replace the built-in catalog with live products from Supabase when configured.
// Falls back silently to the list above so the site still works offline or before setup.
async function loadProducts() {
  const { url, anonKey } = typeof SUPABASE_CONFIG === "object" ? SUPABASE_CONFIG : {};
  if (!url || !anonKey) return;
  try {
    const res = await fetch(`${url}/rest/v1/products?select=*&is_active=eq.true&order=sort_order,created_at`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rows = await res.json();
    if (rows.length) PRODUCTS.splice(0, PRODUCTS.length, ...rows);
  } catch (err) {
    console.warn("Không tải được sản phẩm từ Supabase, dùng danh mục có sẵn.", err);
  }
}
