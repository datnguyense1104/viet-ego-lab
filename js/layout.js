// Shared chrome for every storefront page: header (4-item nav per the brief), footer,
// search, cart drawer + COD checkout, toast, and the anonymous analytics beacon.
// Pages call Site.init({ page }) and then use Site.* helpers.
const Site = (() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const productUrl = (p) => `product.html?id=${encodeURIComponent(p.id)}`;
  const articleUrl = (a) => `article.html?slug=${encodeURIComponent(a.slug)}`;

  const NAV = [
    { page: "home", href: "index.html", label: "Trang chủ" },
    { page: "about", href: "about.html", label: "Về Việt Ego Lab" },
    { page: "products", href: "products.html", label: "Danh mục sản phẩm" },
    { page: "journal", href: "journal.html", label: "Tạp chí mùi hương" },
  ];
  const ICON = {
    menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 016 0v2"/></svg>',
  };

  /** Product image: real photo if set, otherwise a neutral placeholder. Stock photos get a caption. */
  function media(p, variant = 1) {
    const src = variant === 2 ? p.img2 || p.img : p.img;
    if (src) return `<img src="${esc(src)}" alt="${esc(p.name)}" loading="lazy" />`;
    return `<div class="ph"></div>`;
  }
  // Brief: reference (stock) images must be identified. Only Unsplash photos get the caption;
  // the team's own uploads (Supabase Storage or any other host) are shown as-is.
  const isStock = (src) => /(^|\/\/)images\.unsplash\.com\//.test(String(src || ""));
  const refLabel = (src) => (isStock(src) ? '<span class="ref-label">Ảnh minh họa</span>' : "");

  function renderChrome(page) {
    const navLinks = NAV.map((n) => `<a href="${n.href}"${n.page === page ? ' aria-current="page"' : ""}>${n.label}</a>`).join("");
    document.body.insertAdjacentHTML("afterbegin", `
      <a class="skip" href="#main">Bỏ qua điều hướng</a>
      <header class="header">
        <div class="header__inner">
          <button class="icon-btn only-mobile" id="menuOpen" aria-label="Mở menu">${ICON.menu}</button>
          <nav class="nav" id="nav" aria-label="Điều hướng chính">
            <button class="icon-btn only-mobile nav__close" id="menuClose" aria-label="Đóng menu">${ICON.close}</button>
            ${navLinks}
          </nav>
          <a href="index.html" class="logo"><img src="images/logo-wordmark.png" alt="Việt Ego Lab" width="436" height="309" /></a>
          <div class="header__actions">
            <button class="icon-btn" id="searchOpen" aria-label="Tìm kiếm">${ICON.search}</button>
            <button class="icon-btn cart-btn" id="cartOpen" aria-label="Giỏ hàng">${ICON.bag}<span class="cart-count" id="cartCount">0</span></button>
          </div>
        </div>
      </header>`);

    document.body.insertAdjacentHTML("beforeend", `
      <footer class="footer">
        <div class="footer__grid">
          <div>
            <img class="logo--footer" src="images/logo-light.png" alt="Việt Ego Lab – Your Soul, Your Scent" width="436" height="347" loading="lazy" />
            <p class="footer__tagline">${esc(BRAND.tagline)}</p>
          </div>
          <div><h4>Khám phá</h4>${NAV.map((n) => `<a href="${n.href}">${n.label}</a>`).join("")}</div>
          <div>
            <h4>Liên hệ</h4>
            <p class="footer__todo">Địa chỉ, hotline, email: đang cập nhật</p>
          </div>
          <div>
            <h4>Kết nối</h4>
            <a href="#" rel="noopener">Instagram</a><a href="#" rel="noopener">TikTok</a><a href="#" rel="noopener">Facebook</a>
            <h4 class="footer__sub">Chính sách</h4>
            <a href="#">Giao hàng &amp; đổi trả</a><a href="#">Bảo mật dữ liệu</a>
          </div>
        </div>
        <div class="footer__bottom">© ${new Date().getFullYear()} Việt Ego Lab. ${esc(BRAND.tagline)}</div>
      </footer>

      <div class="search" id="search" hidden>
        <div class="search__box">
          <input type="search" id="searchInput" placeholder="Tìm sản phẩm hoặc bài viết..." aria-label="Tìm kiếm" />
          <button class="icon-btn" id="searchClose" aria-label="Đóng">${ICON.close}</button>
          <div class="search__results" id="searchResults"></div>
        </div>
      </div>

      <div class="drawer-backdrop" id="drawerBackdrop" hidden></div>
      <aside class="drawer" id="drawer" aria-label="Giỏ hàng">
        <div class="drawer__head">
          <h3>Giỏ hàng</h3>
          <button class="icon-btn" id="cartClose" aria-label="Đóng giỏ hàng">${ICON.close}</button>
        </div>
        <div class="drawer__items" id="cartItems"></div>
        <div class="drawer__foot" id="cartFoot">
          <div class="drawer__total"><span>Tạm tính</span><strong id="cartTotal">0₫</strong></div>
          <button class="btn btn--block" id="checkoutBtn">Đặt hàng</button>
        </div>
        <form class="checkout" id="checkoutForm" hidden novalidate>
          <p class="eyebrow">Thông tin giao hàng · Thanh toán khi nhận hàng (COD)</p>
          <label>Họ tên *<input name="name" required maxlength="100" autocomplete="name" /></label>
          <label>Số điện thoại *<input name="phone" type="tel" required maxlength="20" autocomplete="tel" /></label>
          <label>Email<input name="email" type="email" maxlength="120" autocomplete="email" /></label>
          <label>Địa chỉ giao hàng *<textarea name="address" required maxlength="300" rows="2" autocomplete="street-address"></textarea></label>
          <label>Ghi chú<textarea name="note" maxlength="500" rows="2"></textarea></label>
          <p class="checkout__error" id="checkoutError" role="alert"></p>
          <div class="drawer__total"><span>Tổng cộng</span><strong id="checkoutTotal">0₫</strong></div>
          <button class="btn btn--block" type="submit" id="placeOrderBtn">Xác nhận đặt hàng</button>
          <button class="checkout__back" type="button" id="checkoutBack">← Quay lại giỏ hàng</button>
        </form>
      </aside>
      <div class="toast" id="toast" role="status"></div>`);
  }

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
  }

  /* ---------- Cart (localStorage) — only priced products can be added ---------- */
  const cart = {
    items: [],
    load() {
      try { this.items = JSON.parse(localStorage.getItem("cart")) || []; } catch { this.items = []; }
      this.items = this.items.filter((l) => isPurchasable(byId(l.id)));
    },
    save() {
      try { localStorage.setItem("cart", JSON.stringify(this.items)); } catch { /* storage blocked */ }
      renderCart();
    },
    add(id, qty = 1) {
      const p = byId(id);
      if (!isPurchasable(p)) return toast("Sản phẩm chưa mở bán.");
      const line = this.items.find((l) => l.id === id);
      if (line) line.qty = Math.min(20, line.qty + qty); else this.items.push({ id, qty });
      this.save();
      toast(`Đã thêm "${p.name}" vào giỏ`);
    },
    setQty(id, qty) {
      if (qty <= 0) this.items = this.items.filter((l) => l.id !== id);
      else this.items.find((l) => l.id === id).qty = Math.min(20, qty);
      this.save();
    },
    count() { return this.items.reduce((s, l) => s + l.qty, 0); },
    total() { return this.items.reduce((s, l) => s + byId(l.id).price * l.qty, 0); },
  };

  function renderCart() {
    $("#cartCount").textContent = cart.count();
    $("#cartTotal").textContent = formatPrice(cart.total());
    $("#checkoutBtn").disabled = !cart.items.length;
    $("#cartItems").innerHTML = cart.items.length
      ? cart.items.map(({ id, qty }) => {
          const p = byId(id);
          return `
            <div class="line">
              <a class="line__media" href="${productUrl(p)}">${media(p)}</a>
              <div>
                <p class="line__name">${esc(p.name)}</p>
                <p class="line__meta">${esc(p.size)}</p>
                <div class="qty">
                  <button data-qty="${esc(id)}" data-d="-1" aria-label="Giảm">−</button><span>${qty}</span><button data-qty="${esc(id)}" data-d="1" aria-label="Tăng">+</button>
                </div>
              </div>
              <div class="line__end">
                <div>${formatPrice(p.price * qty)}</div>
                <button class="line__remove" data-remove="${esc(id)}">Xóa</button>
              </div>
            </div>`;
        }).join("")
      : `<p class="drawer__empty">Giỏ hàng của bạn đang trống.</p>`;
  }

  function initCart() {
    const drawer = $("#drawer"), backdrop = $("#drawerBackdrop");
    const form = $("#checkoutForm");
    const setCheckout = (on) => {
      form.hidden = !on;
      $("#cartItems").hidden = on;
      $("#cartFoot").hidden = on;
      $("#checkoutError").textContent = "";
      $("#checkoutTotal").textContent = formatPrice(cart.total());
    };
    Site.openCart = () => { backdrop.hidden = false; drawer.classList.add("is-open"); document.body.classList.add("no-scroll"); };
    Site.closeCart = () => { backdrop.hidden = true; drawer.classList.remove("is-open"); document.body.classList.remove("no-scroll"); };
    $("#cartOpen").addEventListener("click", Site.openCart);
    $("#cartClose").addEventListener("click", Site.closeCart);
    backdrop.addEventListener("click", Site.closeCart);
    $("#checkoutBtn").addEventListener("click", () => setCheckout(true));
    $("#checkoutBack").addEventListener("click", () => setCheckout(false));

    $("#cartItems").addEventListener("click", (e) => {
      const q = e.target.closest("[data-qty]");
      if (q) {
        const line = cart.items.find((l) => l.id === q.dataset.qty);
        cart.setQty(line.id, line.qty + Number(q.dataset.d));
      }
      const r = e.target.closest("[data-remove]");
      if (r) cart.setQty(r.dataset.remove, 0);
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      if (["name", "phone", "address"].some((k) => !data[k].trim())) {
        $("#checkoutError").textContent = "Vui lòng điền họ tên, số điện thoại và địa chỉ.";
        return;
      }
      const btn = $("#placeOrderBtn");
      btn.disabled = true;
      btn.textContent = "Đang gửi...";
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer: data, items: cart.items.map(({ id, qty }) => ({ id, qty })) }),
        });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result.error || "Không gửi được đơn hàng, vui lòng thử lại.");
        cart.items = [];
        cart.save();
        form.reset();
        setCheckout(false);
        $("#cartItems").innerHTML = `
          <div class="drawer__empty">
            <p><strong>Đặt hàng thành công!</strong></p>
            <p>Mã đơn: <strong>${esc(result.code)}</strong> · ${formatPrice(result.total)}</p>
            <p>Chúng tôi sẽ liên hệ xác nhận trong thời gian sớm nhất.</p>
          </div>`;
      } catch (err) {
        $("#checkoutError").textContent = err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = "Xác nhận đặt hàng";
      }
    });
  }

  /* ---------- Search across products and journal ---------- */
  function initSearch() {
    const box = $("#search"), input = $("#searchInput");
    const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
    const close = () => { box.hidden = true; input.value = ""; $("#searchResults").innerHTML = ""; };
    Site.closeSearch = close;
    $("#searchOpen").addEventListener("click", () => { box.hidden = false; input.focus(); });
    $("#searchClose").addEventListener("click", close);
    box.addEventListener("click", (e) => { if (e.target === box) close(); });
    input.addEventListener("input", () => {
      const q = norm(input.value.trim());
      if (!q) return ($("#searchResults").innerHTML = "");
      const products = PRODUCTS.filter((p) => norm(`${p.name} ${p.region} ${p.notes}`).includes(q))
        .map((p) => `<a class="search__item" href="${productUrl(p)}"><span>${esc(p.name)}</span><span>${formatPrice(p.price)}</span></a>`);
      const articles = ARTICLES.filter((a) => norm(a.title).includes(q))
        .map((a) => `<a class="search__item" href="${articleUrl(a)}"><span>${esc(a.title)}</span><span>Tạp chí</span></a>`);
      const hits = products.concat(articles);
      $("#searchResults").innerHTML = hits.length ? hits.join("") : `<p class="muted">Không tìm thấy kết quả phù hợp.</p>`;
    });
  }

  /* ---------- Newsletter form (any page that includes one) ---------- */
  function initNewsletter() {
    document.querySelectorAll("[data-newsletter]").forEach((form) =>
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!form.querySelector("[name=consent]").checked) return toast("Vui lòng đồng ý nhận tin trước khi đăng ký.");
        try {
          const res = await fetch("/api/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: form.querySelector("[name=email]").value }),
          });
          const result = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(result.error || "Đăng ký chưa thành công, vui lòng thử lại.");
          form.reset();
          toast("Cảm ơn bạn đã đăng ký!");
        } catch (err) {
          toast(err.message);
        }
      })
    );
  }

  /* ---------- Anonymous page-view beacon for /admin analytics (no IP stored) ---------- */
  function trackView() {
    if (!/^https?:$/.test(location.protocol) || !navigator.sendBeacon) return;
    let vid;
    try {
      vid = localStorage.getItem("vid");
      if (!vid) localStorage.setItem("vid", (vid = crypto.randomUUID()));
    } catch {
      vid = crypto.randomUUID();
    }
    const payload = JSON.stringify({ vid, path: location.pathname + location.search, ref: document.referrer });
    navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
  }

  /** Product card per brief 3.2: image, name, short description, volume, price, detail button. */
  function productCard(p) {
    const desc = p.description || `Cảm hứng từ ${p.region}. Thông tin mùi hương đang được cập nhật.`;
    return `
      <article class="card">
        <a class="card__media" href="${productUrl(p)}" aria-label="${esc(p.name)}">
          <div class="card__img1">${media(p, 1)}</div>
          <div class="card__img2">${media(p, 2)}</div>
          ${refLabel(p.img)}
        </a>
        <h3 class="card__name"><a href="${productUrl(p)}">${esc(p.name)}</a></h3>
        <p class="card__desc">${esc(desc)}</p>
        <p class="card__meta">${p.size ? esc(p.size) + " · " : ""}${formatPrice(p.price)}</p>
        <a class="btn btn--outline btn--small" href="${productUrl(p)}">Xem chi tiết</a>
      </article>`;
  }

  /** Journal card per brief 4.3: cover, title, category, excerpt, read time, read button. */
  function articleCard(a) {
    const cat = JOURNAL_CATEGORIES.find((c) => c.id === a.category);
    const soon = a.status !== "published";
    return `
      <article class="post">
        <a class="post__media" href="${articleUrl(a)}" aria-label="${esc(a.title)}">
          ${a.cover ? `<img src="${esc(a.cover)}" alt="" loading="lazy" />` : '<div class="ph"></div>'}
          ${refLabel(a.cover)}
          ${soon ? '<span class="post__badge">Sắp ra mắt</span>' : ""}
        </a>
        <p class="eyebrow">${esc(cat?.name || "")}${a.read_minutes ? ` · ${a.read_minutes} phút đọc` : ""}</p>
        <h3 class="post__title"><a href="${articleUrl(a)}">${esc(a.title)}</a></h3>
        ${a.excerpt ? `<p class="post__excerpt">${esc(a.excerpt)}</p>` : ""}
        <a class="link-arrow" href="${articleUrl(a)}">${soon ? "Xem chủ đề" : "Đọc bài viết"} →</a>
      </article>`;
  }

  /** Bootstraps shared chrome, then loads data. Resolves when products/articles are ready. */
  async function init({ page }) {
    renderChrome(page);
    $("main")?.setAttribute("id", "main");
    initCart();
    initSearch();
    initNewsletter();
    const nav = $("#nav");
    $("#menuOpen").addEventListener("click", () => nav.classList.add("is-open"));
    $("#menuClose").addEventListener("click", () => nav.classList.remove("is-open"));
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      Site.closeCart(); Site.closeSearch(); nav.classList.remove("is-open");
    });
    trackView();
    await Promise.all([loadProducts(), loadArticles()]);
    cart.load();
    renderCart();
  }

  return { init, $, esc, media, refLabel, productCard, articleCard, productUrl, articleUrl, byId, cart, toast };
})();
