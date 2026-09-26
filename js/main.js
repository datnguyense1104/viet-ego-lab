// UI behavior: product rendering, hero carousel, search, quick view, cart drawer.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const byId = (id) => PRODUCTS.find((p) => p.id === id);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Brand name lives in products.js so it can be changed in one place.
  document.querySelectorAll("[data-brand]").forEach((el) => (el.textContent = BRAND.name));
  document.title = `${BRAND.name} — ${BRAND.tagline}`;
  $("#year").textContent = new Date().getFullYear();

  /* ---------- Product media (real image if provided, otherwise placeholder) ---------- */
  function media(p, variant = 1) {
    const src = variant === 2 ? p.img2 : p.img;
    if (src) return `<img src="${escapeHtml(src)}" alt="${escapeHtml(p.name)}" loading="lazy" />`;
    const wide = p.cat === "home" || p.cat === "set" ? " bottle--wide" : "";
    const hue = variant === 2 ? p.hue + 20 : p.hue;
    const label = variant === 2 ? "" : "V · EGO";
    return `<div class="ph" style="--h:${hue}"><span class="bottle${wide}" style="--h:${hue}" data-label="${label}"></span></div>`;
  }

  /* ---------- Render collections ---------- */
  function renderCollections() {
    $("#navCategories").innerHTML = CATEGORIES.map((c) => `<a href="#cat-${c.id}">${c.name}</a>`).join("");
    $("#shop").innerHTML = CATEGORIES.map((c) => {
      const items = PRODUCTS.filter((p) => p.cat === c.id);
      if (!items.length) return "";
      return `
        <section class="collection" id="cat-${c.id}">
          <div class="collection__head">
            <h2 class="section-title">${c.name}</h2>
            <p>${c.desc}</p>
          </div>
          <div class="grid">${items.map(cardHtml).join("")}</div>
        </section>`;
    }).join("");
  }

  function cardHtml(p) {
    return `
      <article class="card" data-id="${p.id}">
        <div class="card__media">
          <div class="card__img1">${media(p, 1)}</div>
          <div class="card__img2">${media(p, 2)}</div>
          <button class="card__add" data-add="${p.id}">Thêm vào giỏ</button>
        </div>
        <p class="card__notes">${escapeHtml(p.region)}</p>
        <h3 class="card__name">${escapeHtml(p.name)}</h3>
        <p class="card__notes">${escapeHtml(p.notes)}</p>
        <div class="card__price">${formatPrice(p.price)} <span class="card__notes">· ${p.size}</span></div>
      </article>`;
  }

  $("#shop").addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) return cart.add(add.dataset.add, 1);
    const card = e.target.closest(".card");
    if (card) openQuickView(card.dataset.id);
  });

  /* ---------- Scent finder: pick a mood, get the matching Eau de Parfum ---------- */
  function initFinder() {
    const options = $("#finderOptions");
    options.innerHTML = SCENT_FINDER.map((o) => `<button data-mood="${o.mood}">${o.label}</button>`).join("");
    options.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-mood]");
      if (!btn) return;
      options.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
      const p = PRODUCTS.find((x) => x.cat === "edp" && x.mood === btn.dataset.mood);
      if (!p) return;
      $("#finderResult").innerHTML = `
        <div class="finder__media">${media(p, 1)}</div>
        <div>
          <p class="eyebrow">Mùi hương dành cho bạn</p>
          <h3>${escapeHtml(p.name)}</h3>
          <p>${escapeHtml(p.story)}</p>
          <p class="card__notes">${escapeHtml(p.notes)} · ${formatPrice(p.price)}</p>
          <button class="btn" data-finder-view="${p.id}">Xem chi tiết</button>
        </div>`;
    });
    $("#finderResult").addEventListener("click", (e) => {
      const view = e.target.closest("[data-finder-view]");
      if (view) openQuickView(view.dataset.finderView);
    });
  }

  /* ---------- Hero carousel ---------- */
  function initHero() {
    const slides = [...document.querySelectorAll(".hero__slide")];
    const dots = $("#heroDots");
    let index = 0;
    let timer;
    dots.innerHTML = slides.map((_, i) => `<button aria-label="Slide ${i + 1}"></button>`).join("");
    const dotBtns = [...dots.children];

    const go = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, j) => s.classList.toggle("is-active", j === index));
      dotBtns.forEach((d, j) => d.classList.toggle("is-active", j === index));
      clearInterval(timer);
      timer = setInterval(() => go(index + 1), 5000);
    };
    dotBtns.forEach((d, i) => d.addEventListener("click", () => go(i)));
    $("#heroPrev").addEventListener("click", () => go(index - 1));
    $("#heroNext").addEventListener("click", () => go(index + 1));
    go(0);
  }

  /* ---------- Cart (persisted in localStorage) ---------- */
  const cart = {
    key: "cart",
    items: [],
    load() {
      try { this.items = JSON.parse(localStorage.getItem(this.key)) || []; } catch { this.items = []; }
      this.items = this.items.filter((l) => byId(l.id));
    },
    save() {
      try { localStorage.setItem(this.key, JSON.stringify(this.items)); } catch { /* storage unavailable */ }
      renderCart();
    },
    add(id, qty) {
      const line = this.items.find((l) => l.id === id);
      if (line) line.qty += qty; else this.items.push({ id, qty });
      this.save();
      toast(`Đã thêm "${byId(id).name}" vào giỏ`);
    },
    setQty(id, qty) {
      if (qty <= 0) this.items = this.items.filter((l) => l.id !== id);
      else this.items.find((l) => l.id === id).qty = qty;
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
              <div class="line__media">${media(p, 1)}</div>
              <div>
                <p class="line__name">${escapeHtml(p.name)}</p>
                <p class="line__meta">${p.size}</p>
                <div class="qty">
                  <button data-qty="${id}" data-d="-1" aria-label="Giảm">−</button><span>${qty}</span><button data-qty="${id}" data-d="1" aria-label="Tăng">+</button>
                </div>
              </div>
              <div style="text-align:right">
                <div>${formatPrice(p.price * qty)}</div>
                <button class="line__remove" data-remove="${id}">Xóa</button>
              </div>
            </div>`;
        }).join("")
      : `<p class="drawer__empty">Giỏ hàng của bạn đang trống.</p>`;
  }

  $("#cartItems").addEventListener("click", (e) => {
    const q = e.target.closest("[data-qty]");
    if (q) {
      const line = cart.items.find((l) => l.id === q.dataset.qty);
      cart.setQty(line.id, line.qty + Number(q.dataset.d));
    }
    const r = e.target.closest("[data-remove]");
    if (r) cart.setQty(r.dataset.remove, 0);
  });

  const drawer = $("#drawer");
  const backdrop = $("#drawerBackdrop");
  const openCart = () => { backdrop.hidden = false; drawer.classList.add("is-open"); document.body.classList.add("no-scroll"); };
  const closeCart = () => { backdrop.hidden = true; drawer.classList.remove("is-open"); document.body.classList.remove("no-scroll"); };
  $("#cartOpen").addEventListener("click", openCart);
  $("#cartClose").addEventListener("click", closeCart);
  backdrop.addEventListener("click", closeCart);
  /* ---------- Checkout (POST /api/orders, cash on delivery) ---------- */
  const checkoutForm = $("#checkoutForm");
  const setCheckout = (on) => {
    checkoutForm.hidden = !on;
    $("#cartItems").hidden = on;
    $("#cartFoot").hidden = on;
    $("#checkoutError").textContent = "";
    $("#checkoutTotal").textContent = formatPrice(cart.total());
  };
  $("#checkoutBtn").addEventListener("click", () => setCheckout(true));
  $("#checkoutBack").addEventListener("click", () => setCheckout(false));

  checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(checkoutForm));
    const missing = ["name", "phone", "address"].filter((k) => !data[k].trim());
    if (missing.length) {
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
      checkoutForm.reset();
      setCheckout(false);
      $("#cartItems").innerHTML = `
        <div class="drawer__empty">
          <p><strong>Đặt hàng thành công!</strong></p>
          <p>Mã đơn: <strong>${escapeHtml(result.code)}</strong> · ${formatPrice(result.total)}</p>
          <p>Chúng tôi sẽ gọi điện xác nhận trong thời gian sớm nhất.</p>
        </div>`;
    } catch (err) {
      $("#checkoutError").textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = "Xác nhận đặt hàng";
    }
  });

  /* ---------- Quick view modal ---------- */
  const modal = $("#modal");
  function openQuickView(id) {
    const p = byId(id);
    let qty = 1;
    $("#modalBody").innerHTML = `
      <button class="icon-btn modal__close" data-close aria-label="Đóng"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <div class="modal__media">${media(p, 1)}</div>
      <div class="modal__info">
        <p class="eyebrow">${CATEGORIES.find((c) => c.id === p.cat).name}</p>
        <h2>${escapeHtml(p.name)}</h2>
        <p>${escapeHtml(p.story)}</p>
        <p class="card__notes">Vùng đất: ${escapeHtml(p.region)} · Tầng hương: ${escapeHtml(p.notes)}</p>
        <div>${formatPrice(p.price)} · ${p.size}</div>
        <div class="qty"><button data-mq="-1">−</button><span id="mqVal">1</span><button data-mq="1">+</button></div>
        <button class="btn" id="mqAdd">Thêm vào giỏ</button>
      </div>`;
    $("#modalBody").querySelectorAll("[data-mq]").forEach((b) =>
      b.addEventListener("click", () => { qty = Math.max(1, qty + Number(b.dataset.mq)); $("#mqVal").textContent = qty; })
    );
    $("#mqAdd").addEventListener("click", () => { cart.add(p.id, qty); closeModal(); openCart(); });
    modal.hidden = false;
    document.body.classList.add("no-scroll");
  }
  const closeModal = () => { modal.hidden = true; document.body.classList.remove("no-scroll"); };
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });

  /* ---------- Search ---------- */
  const search = $("#search");
  const input = $("#searchInput");
  const normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase();
  $("#searchOpen").addEventListener("click", () => { search.hidden = false; input.focus(); });
  const closeSearch = () => { search.hidden = true; input.value = ""; $("#searchResults").innerHTML = ""; };
  $("#searchClose").addEventListener("click", closeSearch);
  search.addEventListener("click", (e) => { if (e.target === search) closeSearch(); });
  input.addEventListener("input", () => {
    const q = normalize(input.value.trim());
    const hits = q ? PRODUCTS.filter((p) => normalize(`${p.name} ${p.notes} ${p.region}`).includes(q)) : [];
    $("#searchResults").innerHTML = q && !hits.length
      ? `<p class="card__notes">Không tìm thấy sản phẩm phù hợp.</p>`
      : hits.map((p) => `<div class="search__item" data-id="${p.id}"><span>${escapeHtml(p.name)}</span><span>${formatPrice(p.price)}</span></div>`).join("");
  });
  $("#searchResults").addEventListener("click", (e) => {
    const item = e.target.closest(".search__item");
    if (item) { closeSearch(); openQuickView(item.dataset.id); }
  });

  /* ---------- Mobile nav ---------- */
  const nav = $("#nav");
  $("#menuOpen").addEventListener("click", () => nav.classList.add("is-open"));
  $("#menuClose").addEventListener("click", () => nav.classList.remove("is-open"));
  nav.addEventListener("click", (e) => { if (e.target.tagName === "A") nav.classList.remove("is-open"); });

  /* ---------- Misc ---------- */
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeModal(); closeCart(); closeSearch(); nav.classList.remove("is-open");
  });

  $("#newsletterForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const email = form.querySelector("input[type=email]").value;
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result.error || "Đăng ký chưa thành công, vui lòng thử lại.");
      form.reset();
      toast("Cảm ơn bạn đã đăng ký!");
    } catch (err) {
      toast(err.message);
    }
  });

  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 2400);
  }

  /* ---------- Anonymous page-view beacon for the admin analytics ---------- */
  function trackView() {
    if (!/^https?:$/.test(location.protocol) || !navigator.sendBeacon) return;
    let vid;
    try {
      vid = localStorage.getItem("vid");
      if (!vid) localStorage.setItem("vid", (vid = crypto.randomUUID()));
    } catch {
      vid = crypto.randomUUID(); // storage blocked: count this view as a one-off visitor
    }
    const payload = JSON.stringify({ vid, path: location.pathname, ref: document.referrer });
    navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
  }

  initHero();
  trackView();
  // Product-dependent UI waits for the live catalog (or the built-in fallback).
  loadProducts().then(() => {
    renderCollections();
    initFinder();
    cart.load();
    renderCart();
  });
})();
