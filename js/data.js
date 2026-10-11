// Shared site data + loaders. Content follows the project brief:
// only confirmed product facts are filled in; everything else stays empty and renders as "đang cập nhật".
const BRAND = { name: "VIỆT EGO LAB", tagline: "YOUR SOUL, YOUR SCENT." };

// Stock photos (Unsplash License) are reference images, not product photography.
// Each was checked for third-party brand labels before use.
const unsplash = (id, w = 1000) => `https://images.unsplash.com/photo-${id}?w=${w}&q=75&auto=format&fit=crop`;

// Catalog content from the team's product sheet (brief doc, product tab, 2026-10-11).
// Text formats (also used by /admin and supabase/product-content.sql):
//   notes  — one block per tier, blocks separated by a blank line; first line = tier title.
//   story  — paragraphs separated by a blank line.
//   usage  — one instruction per line.
//   info   — one "Thuộc tính: Mô tả" pair per line.
const USAGE_STANDARD = [
  "Xịt lên các điểm có mạch đập như cổ tay, sau tai và hai bên cổ.",
  "Tránh xịt trực tiếp vào mắt hoặc vùng da bị tổn thương, kích ứng.",
  "Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp và nhiệt độ cao.",
  "Đậy nắp sau khi sử dụng để duy trì chất lượng hương thơm.",
].join("\n");

const PRODUCTS = [
  {
    id: "com-xanh-ha-noi", name: "Cốm xanh Hà Nội", region: "Hà Nội",
    price: 890000, size: "50ml", scent_family: "Xanh, ngọt dịu, gỗ ấm",
    description: "Lấy cảm hứng từ cốm xanh Hà Nội, tái hiện hương thơm thanh mát, dịu ngọt của lúa non trong một dấu hương đậm bản sắc Việt.",
    notes: [
      "Hương đầu – Sớm mai trên đồng lúa\nNốt hương lá xanh và cam bergamot mở ra cảm giác tươi mát, trong trẻo, gợi hình ảnh những cánh đồng lúa non đẫm sương sớm.",
      "Hương giữa – Hồn cốm mùa thu\nHương cốm xanh hòa quyện cùng gạo nếp non và hoa sen dịu nhẹ, tái hiện vị ngọt thanh, mềm mại của cốm mới, gợi nhớ nét tinh tế trong văn hóa ẩm thực Hà Nội.",
      "Hương cuối – Dư vị đất Bắc\nGỗ đàn hương, xạ hương trắng và vani nhẹ nhàng lưu lại trên da, tạo nên chiều sâu ấm áp, mềm mại, tựa dư vị mùa thu Hà Nội còn vương vấn sau những bước chân.",
    ].join("\n\n"),
    story: "Giữa nhịp sống hiện đại, hương cốm xanh Hà Nội gợi nhắc về những giá trị thân thuộc của quê hương. Hương lúa non thanh mát hòa cùng vị ngọt dịu của cốm mới, tạo nên dấu hương tinh tế, mang đậm nét đẹp Việt. Khi sử dụng, bạn không chỉ khoác lên mình một mùi hương riêng biệt, mà còn mang theo một phần ký ức Hà Nội, để văn hóa truyền thống hiện diện trong từng khoảnh khắc thường ngày. Bởi đôi khi, quê hương không ở đâu xa, mà nằm trong hương thơm ta lựa chọn mang theo.",
    usage: "Xịt lên cổ tay, sau tai hoặc hai bên cổ để hương thơm lan tỏa tự nhiên.\nBảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp.",
    info: [
      "Tên sản phẩm: Cốm Xanh Hà Nội", "Loại nước hoa: Eau de Parfum (EDP)", "Dung tích: 50 ml",
      "Nhóm hương: Xanh, ngọt dịu, gỗ ấm", "Phong cách: Thanh tao, tinh tế, hoài niệm",
      "Đối tượng: Mọi giới", "Xuất xứ: Việt Nam",
    ].join("\n"),
    img: unsplash("1705899853374-d91c048b81d2"), img2: unsplash("1561504935-4e7d4516a2d1"),
  },
  {
    id: "sen-dong-thap", name: "Sen Đồng Tháp", region: "Đồng Tháp",
    price: 890000, size: "50ml", scent_family: "Floral Green – Fruity – Soft Woody",
    description: "Lấy cảm hứng từ những đầm sen Đồng Tháp Mười, tái hiện hương thơm thanh khiết của hoa sen hòa quyện cùng nét tươi mát của lá sen non và vị ngọt thanh của quýt hồng Lai Vung, tạo nên dấu hương tinh tế, đậm bản sắc miền Tây Nam Bộ.",
    notes: [
      "Hương đầu – Sắc xanh đầm sen\nLá sen non, quýt hồng Lai Vung.",
      "Hương giữa – Hồn sen Tháp Mười\nHoa sen hồng, trà sen, hoa lài.",
      "Hương cuối – Dư vị miền sông nước\nGỗ tre, xạ hương trắng, hổ phách nhẹ.",
    ].join("\n\n"),
    story: "Giữa miền đất phương Nam trù phú, những đầm sen Đồng Tháp vươn mình trong nắng sớm, mang vẻ đẹp thanh khiết và sức sống bền bỉ. Hương hoa sen dịu dàng hòa quyện cùng sắc xanh của lá, vị ngọt tươi của quýt hồng Lai Vung và nét ấm áp của gỗ, tạo nên bức tranh hương thơm về một miền quê bình yên. Không chỉ là một chai nước hoa, sản phẩm còn gửi gắm niềm tự hào về thiên nhiên và văn hóa Việt Nam, để mỗi người có thể mang theo một phần hương sắc quê hương theo cách riêng của mình.",
    usage: [
      "Xịt nước hoa lên các vị trí như cổ tay, sau tai và hai bên cổ để hương thơm lan tỏa.",
      "Tránh xịt trực tiếp vào mắt hoặc vùng da bị kích ứng.",
      "Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp và nhiệt độ cao.",
    ].join("\n"),
    info: [
      "Tên sản phẩm: Sen Đồng Tháp", "Thương hiệu: Viet Ego Lab", "Dung tích: 50 ml", "Nồng độ: Eau de Parfum (EDP)",
      "Nhóm hương: Floral Green – Fruity – Soft Woody", "Mùi hương chủ đạo: Hoa sen, lá sen non, quýt hồng, trà sen, gỗ tre",
      "Phong cách: Thanh khiết, tươi mát, dịu dàng", "Đối tượng sử dụng: Nữ", "Xuất xứ: Việt Nam",
    ].join("\n"),
    img: unsplash("1615108395437-df128ad79e80"), img2: unsplash("1538998073820-4dfa76300194"),
  },
  {
    id: "phu-sa-cuu-long", name: "Phù Sa Cửu Long", region: "Đồng bằng sông Cửu Long",
    price: 890000, size: "50ml", scent_family: "Earthy – Green – Woody – Amber",
    description: "Lấy cảm hứng từ những dòng sông bồi đắp phù sa qua bao mùa nước nổi, tái hiện hương thơm của miền châu thổ qua sắc xanh của lá dứa, hương thóc non và nét trầm ấm của gỗ lũa, tạo nên dấu hương mộc mạc, sâu lắng, mang đậm hơi thở miền Tây Nam Bộ.",
    notes: [
      "Hương đầu – Dòng nước khởi nguồn\nLá dứa, vỏ bưởi xanh và tiêu hồng mang đến cảm giác xanh mát, thanh nhẹ, điểm chút cay dịu như làn gió sớm ven sông.",
      "Hương giữa – Mùa vàng châu thổ\nThóc non, khóm chín và hoa lục bình hòa quyện giữa nét ngọt dịu của trái cây, hương xanh của đồng lúa và sự mềm mại của hoa.",
      "Hương cuối – Hồn đất lưu dòng\nCỏ hương bài, gỗ lũa và nhựa benzoin tạo dư vị trầm ấm, mộc mạc, gợi hình ảnh đất phù sa và những dòng sông miền Tây.",
    ].join("\n\n"),
    story: [
      "Từ những dòng sông miệt mài chảy qua miền châu thổ, phù sa âm thầm bồi đắp nên những cánh đồng xanh mướt và mùa vàng trĩu hạt. Đó là vẻ đẹp bình dị của Cửu Long, nơi đất đai, cây trái và con người gắn bó qua từng nhịp nước, từng mùa lúa.",
      "Phù Sa Cửu Long lưu giữ nét đẹp ấy qua hương xanh của lá dứa, mùi thóc non trên đồng và sự trầm ấm của gỗ lũa bên dòng sông. Từng tầng hương hòa quyện, mở đầu tươi mát, chuyển sang ngọt dịu rồi lắng đọng trong dư vị mộc mạc, sâu sắc. Không phô trương, không cầu kỳ, Phù Sa Cửu Long kể câu chuyện về một miền đất được nuôi dưỡng bởi dòng sông, về sức sống bền bỉ và vẻ đẹp chân thành của quê hương Việt Nam.",
    ].join("\n\n"),
    usage: [
      "Xịt nước hoa lên cổ tay, sau tai hoặc hai bên cổ để hương thơm lan tỏa.",
      "Tránh xịt trực tiếp vào mắt hoặc vùng da bị kích ứng.",
      "Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp và nhiệt độ cao.",
    ].join("\n"),
    info: [
      "Tên sản phẩm: Phù Sa Cửu Long", "Thương hiệu: Viet Ego Lab", "Dung tích: 50 ml", "Nồng độ: Eau de Parfum (EDP)",
      "Nhóm hương: Earthy – Green – Woody – Amber", "Mùi hương chủ đạo: Lá dứa, thóc non, khóm chín, cỏ hương bài, gỗ lũa",
      "Phong cách: Mộc mạc, trầm ấm, tự nhiên", "Đối tượng sử dụng: Mọi giới", "Xuất xứ: Việt Nam",
    ].join("\n"),
    img: unsplash("1733660227163-01bc46e0d7d7"), img2: "images/phu-sa-river.webp",
  },
  {
    // Id kept from the first brief ("Hạt cà phê Tây Nguyên") so existing links keep working.
    id: "hat-ca-phe-tay-nguyen", name: "Cà Phê Tây Nguyên", region: "Tây Nguyên",
    price: 890000, size: "50ml", scent_family: "Cà phê rang – Gia vị – Gỗ",
    description: "Cà Phê Tây Nguyên mang hương thơm của những đồi cà phê trên vùng đất đỏ bazan, nơi nắng gió đại ngàn nuôi dưỡng những hạt cà phê đậm vị. Sự kết hợp giữa cà phê rang, gia vị ấm và gỗ khô tạo nên mùi hương mạnh mẽ, sâu lắng, thể hiện nét hoang sơ và phóng khoáng của Tây Nguyên.",
    notes: [
      "Hương đầu – Sương sớm đại ngàn\nLá xanh, tiêu đen, bạch đậu khấu. Mở đầu tươi xanh, cay nhẹ, gợi cảm giác sương sớm len qua những đồi cà phê.",
      "Hương giữa – Linh hồn hạt cà phê\nCà phê rang đậm, espresso, hạt cà phê nghiền. Tầng hương chủ đạo đậm đắng, ấm áp và cuốn hút, tái hiện mùi thơm của những hạt cà phê vừa rang.",
      "Hương cuối – Dư vị đất đỏ\nGỗ tuyết tùng, cỏ hương bài. Hương gỗ khô ấm hòa cùng sắc thái đất trầm, tạo nên dư vị mộc mạc, vững chãi và sâu lắng như vùng đất đỏ bazan.",
    ].join("\n\n"),
    story: [
      "Giữa đại ngàn Tây Nguyên, những đồi cà phê trải dài trên nền đất đỏ bazan, đón nắng qua từng mùa và lặng lẽ kết tinh hương vị của vùng cao nguyên đầy nắng gió. Từ những hạt cà phê được rang thơm đến mùi gỗ khô và hơi thở hoang sơ của núi rừng, mỗi tầng hương đều gợi nhắc về một miền đất mạnh mẽ, tự do và giàu sức sống.",
      "Cà Phê Tây Nguyên mở đầu bằng nét xanh cay nhẹ, chuyển dần sang hương cà phê rang đậm đà, rồi lắng lại trên nền gỗ tuyết tùng và cỏ hương bài trầm ấm. Không phô trương hay cầu kỳ, mùi hương mang vẻ cuốn hút riêng của người yêu tự do, trân trọng bản sắc và luôn vững vàng với cá tính của mình.",
    ].join("\n\n"),
    usage: USAGE_STANDARD,
    info: [
      "Tên sản phẩm: Cà Phê Tây Nguyên", "Thương hiệu: Viet Ego Lab", "Dung tích: 50 ml", "Nồng độ: Eau de Parfum (EDP)",
      "Nhóm hương: Cà phê rang – Gia vị – Gỗ", "Nốt hương chủ đạo: Cà phê rang, tiêu đen, bạch đậu khấu, gỗ tuyết tùng, cỏ hương bài",
      "Phong cách: Mạnh mẽ, ấm áp, phóng khoáng", "Đối tượng sử dụng: Nam", "Xuất xứ thương hiệu: Việt Nam",
    ].join("\n"),
    img: unsplash("1635796332668-78830169097d"), img2: unsplash("1447933601403-0c6688de566e"),
  },
  {
    id: "long-tra-da-lat", name: "Long Trà Đà Lạt", region: "Đà Lạt",
    price: 890000, size: "50ml", scent_family: "Trà – Béo mịn – Gỗ ấm",
    description: "Long Trà Đà Lạt mang hương thơm của những đồi trà trên cao nguyên, nơi những búp trà non vươn mình trong tiết trời se lạnh và làn sương sớm bao phủ triền đồi. Sự kết hợp giữa vị béo bùi của hạt phỉ, kem sữa, nét thanh dịu của trà ô long và dư vị gỗ ấm tạo nên mùi hương mềm mại, tinh tế, gợi nét bình yên đặc trưng của Đà Lạt.",
    notes: [
      "Hương đầu – Búp trà non\nHạt phỉ, kem sữa, lá trà non. Vị béo bùi, mịn màng của hạt phỉ và kem sữa hòa cùng nét xanh dịu của lá trà, gợi cảm giác mềm mại của những búp trà non trong tiết trời se lạnh Đà Lạt.",
      "Hương giữa – Long trà Cầu Đất\nTrà ô long, hoa trà, hoa nhài. Hương trà ô long thanh dịu hòa cùng nét hoa nhẹ nhàng, tái hiện hương thơm đặc trưng của những đồi trà trên cao nguyên.",
      "Hương cuối – Trà ấm cao nguyên\nGỗ đàn hương, vani, xạ hương trắng. Gỗ đàn hương ấm mượt kết hợp cùng vani dịu ngọt và xạ hương sạch thoáng, tạo dư vị mềm mại, sâu lắng như hương trà còn vương trong căn nhà nhỏ giữa Đà Lạt.",
    ].join("\n\n"),
    story: [
      "Đà Lạt luôn có cách khiến người ta muốn quay trở lại — một chút mờ sương trên triền đồi, những con đường quanh co dưới tán thông và những buổi sáng bình yên chẳng cần vội vã. Từ vùng đất của những đồi trà Cầu Đất, Long Trà Đà Lạt ra đời như một lời mời gọi bạn chậm lại, tận hưởng những điều giản dị và tìm thấy sự an yên giữa cuộc sống bộn bề.",
      "Mang Long Trà Đà Lạt bên mình, bạn như giữ lại một góc cao nguyên thân thuộc, để dù ở bất cứ đâu, vẫn có thể tìm thấy chút bình yên dành riêng cho mình.",
    ].join("\n\n"),
    usage: USAGE_STANDARD,
    info: [
      "Tên sản phẩm: Long Trà Đà Lạt", "Thương hiệu: Viet Ego Lab", "Dung tích: 50 ml", "Nồng độ: Eau de Parfum (EDP)",
      "Nhóm hương: Trà – Béo mịn – Gỗ ấm", "Nốt hương chủ đạo: Hạt phỉ, kem sữa, lá trà non, trà ô long, hoa trà, hoa nhài, gỗ đàn hương, vani, xạ hương trắng",
      "Phong cách: Mềm mại, tinh tế, thư thái", "Đối tượng sử dụng: Nữ", "Xuất xứ thương hiệu: Việt Nam",
    ].join("\n"),
    img: unsplash("1594125311687-3b1b3eafa9f4"), img2: unsplash("1764141738717-896b3365c196"),
  },
].map((p) => ({
  collection: "", scent_family: "", notes: "", description: "", story: "", usage: "", info: "",
  price: null, size: "", gallery: [], ...p,
}));

// Display order chosen by the team (2026-10-11). Live order comes from products.sort_order in
// Supabase (editable in /admin); keep this list in sync so the offline fallback matches.
const DISPLAY_ORDER = ["com-xanh-ha-noi", "long-tra-da-lat", "sen-dong-thap", "phu-sa-cuu-long", "hat-ca-phe-tay-nguyen"];
PRODUCTS.sort((a, b) => DISPLAY_ORDER.indexOf(a.id) - DISPLAY_ORDER.indexOf(b.id));
PRODUCTS.forEach((p, i) => (p.sort_order = i));

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
    category: "mui-huong-va-ban-sac", cover: "images/identity-lotus.webp" },
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
