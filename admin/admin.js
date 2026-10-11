// Admin dashboard: Supabase Auth login, then orders / products / subscribers management.
// Every write goes through the signed-in user's session; RLS (supabase/schema.sql) only allows
// users listed in public.admins, so hiding UI here is convenience, not security.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => (n == null ? "—" : Number(n).toLocaleString("vi-VN") + "₫");
  const dateTime = (s) => new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

  const STATUS = {
    new: "Mới",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao",
    done: "Hoàn thành",
    cancelled: "Đã huỷ",
  };
  const BUCKET = "product-images";

  const { url, anonKey } = SUPABASE_CONFIG;
  if (!url || !anonKey) {
    $("#setupView").hidden = false;
    return;
  }
  const db = supabase.createClient(url, anonKey);

  /* ---------- Helpers ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 2600);
  }
  // Throw on Supabase errors so callers can use try/catch uniformly.
  const must = ({ data, error }) => {
    if (error) throw error;
    return data;
  };
  const options = (map, selected) =>
    Object.entries(map).map(([v, l]) => `<option value="${esc(v)}"${v === selected ? " selected" : ""}>${esc(l)}</option>`).join("");
  const badge = (s) => `<span class="badge badge--${esc(s)}">${esc(STATUS[s] || s)}</span>`;
  const table = (head, rows, emptyText) =>
    rows.length
      ? `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>`
      : `<div class="table-wrap"><p class="empty">${emptyText}</p></div>`;

  const modal = $("#modal");
  const openModal = (html) => {
    $("#modalBody").innerHTML = html;
    modal.hidden = false;
  };
  const closeModal = () => (modal.hidden = true);
  modal.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  /* ---------- Auth ---------- */
  async function showApp(session) {
    const isAdmin = must(await db.rpc("is_admin"));
    if (!isAdmin) {
      await db.auth.signOut();
      showLogin("Tài khoản này không có quyền quản trị.");
      return;
    }
    $("#loginView").hidden = true;
    $("#appView").hidden = false;
    $("#userEmail").textContent = session.user.email;
    switchTab("dashboard");
  }
  function showLogin(message = "") {
    $("#appView").hidden = true;
    $("#loginView").hidden = false;
    $("#loginError").textContent = message;
  }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector("button");
    btn.disabled = true;
    $("#loginError").textContent = "";
    try {
      const { email, password } = Object.fromEntries(new FormData(form));
      const { session } = must(await db.auth.signInWithPassword({ email, password }));
      form.reset();
      await showApp(session);
    } catch (err) {
      $("#loginError").textContent = err.message === "Invalid login credentials" ? "Sai email hoặc mật khẩu." : err.message;
    } finally {
      btn.disabled = false;
    }
  });
  $("#logoutBtn").addEventListener("click", async () => {
    await db.auth.signOut();
    showLogin();
  });

  /* ---------- Tabs ---------- */
  const loaders = { dashboard: loadDashboard, orders: loadOrders, products: loadProducts, journal: loadArticles, subscribers: loadSubscribers };
  function switchTab(tab) {
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("is-active", b.dataset.tab === tab));
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== tab));
    loaders[tab]().catch((err) => toast("Lỗi tải dữ liệu: " + err.message));
  }
  $("#tabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-tab]");
    if (b) switchTab(b.dataset.tab);
  });

  /* ---------- Dashboard ---------- */
  // Metrics shown as tabs above the line chart; `key` matches analytics_daily/analytics_totals columns.
  const compact = (n) => Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  const METRICS = [
    { key: "visitors", label: "Người dùng", format: (v) => Number(v).toLocaleString("vi-VN") },
    { key: "views", label: "Lượt xem trang", format: (v) => Number(v).toLocaleString("vi-VN") },
    { key: "orders", label: "Đơn hàng", format: (v) => Number(v).toLocaleString("vi-VN") },
    { key: "sales", label: "Doanh số", format: (v, axis) => (axis ? compact(v) : money(v)) },
  ];
  let activeMetric = "visitors";
  let dashData = null;
  let lineDraw = null;
  let rtTimer = null;
  const dayLabel = (d) => new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const countryName = (() => {
    const names = new Intl.DisplayNames(["vi"], { type: "region" });
    return (code) => { try { return code ? names.of(code) : "Không rõ"; } catch { return code; } };
  })();

  function deltaHtml(cur, prev) {
    if (!prev) return `<span class="delta delta--flat">${cur ? "mới" : "–"}</span>`;
    const pct = ((cur - prev) / prev) * 100;
    const dir = Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "up" : "down";
    const arrow = { up: "↑", down: "↓", flat: "→" }[dir];
    return `<span class="delta delta--${dir}">${arrow} ${Math.abs(pct).toFixed(1)}% so với kỳ trước</span>`;
  }

  function renderMetricTabs() {
    const { totals } = dashData;
    $("#metricTabs").innerHTML = METRICS.map((m) => `
      <button class="metric-tab" role="tab" data-metric="${m.key}" aria-selected="${m.key === activeMetric}">
        <span class="metric-tab__label">${m.label}</span>
        <span class="metric-tab__value">${esc(m.format(totals.current[m.key]))}</span>
        ${deltaHtml(totals.current[m.key], totals.previous[m.key])}
      </button>`).join("");
  }

  function renderLine() {
    const { daily, days } = dashData;
    const metric = METRICS.find((m) => m.key === activeMetric);
    const prev = daily.slice(0, days), cur = daily.slice(days);
    const opts = {
      labels: cur.map((r) => dayLabel(r.day)),
      prevLabels: prev.map((r) => dayLabel(r.day)),
      current: cur.map((r) => Number(r[metric.key])),
      previous: prev.map((r) => Number(r[metric.key])),
      format: metric.format,
      aria: `${metric.label} theo ngày, ${days} ngày qua so với kỳ trước`,
    };
    const host = $("#lineChart");
    host.innerHTML = "";
    lineDraw = Charts.line(host, opts);
    $("#lineTable").innerHTML = table(
      ["Ngày", metric.label, "Kỳ trước"],
      cur.map((r, i) => `<tr><td>${opts.labels[i]}</td><td>${esc(metric.format(opts.current[i]))}</td><td>${esc(metric.format(opts.previous[i]))}</td></tr>`).reverse(),
      "Chưa có dữ liệu."
    );
  }

  $("#metricTabs").addEventListener("click", (e) => {
    const tab = e.target.closest("[data-metric]");
    if (!tab || !dashData) return;
    activeMetric = tab.dataset.metric;
    renderMetricTabs();
    renderLine();
  });
  $("#rangeSelect").addEventListener("change", () => loadDashboard().catch((err) => toast(err.message)));

  async function loadRealtime() {
    const rt = must(await db.rpc("analytics_realtime"));
    $("#rtActive").textContent = rt.active.toLocaleString("vi-VN");
    const host = $("#rtChart");
    host.innerHTML = "";
    Charts.columns(host, {
      values: rt.minutes,
      label: (i) => (i === 29 ? "Phút này" : `${29 - i} phút trước`),
      aria: `Người dùng mỗi phút trong 30 phút qua, tổng ${rt.active}`,
    });
    $("#rtCountries").innerHTML = rt.countries.length
      ? rt.countries.map((c) => `<tr><td>${esc(countryName(c.country))}</td><td>${c.n}</td></tr>`).join("")
      : `<tr><td colspan="2" class="muted">Chưa có ai đang truy cập.</td></tr>`;
    $("#rtUpdated").textContent = "Cập nhật lúc " + new Date().toLocaleTimeString("vi-VN");
  }

  async function loadDashboard() {
    const days = Number($("#rangeSelect").value);
    $("#legendCur").textContent = `${days} ngày qua`;
    // Head-only count queries return { count, error } instead of rows.
    const count = (q) => q.then(({ count: c, error }) => { if (error) throw error; return c ?? 0; });
    const [daily, totals, orders, activeProducts, newOrders, subscribers] = await Promise.all([
      db.rpc("analytics_daily", { p_days: days }).then(must),
      db.rpc("analytics_totals", { p_days: days }).then(must),
      db.from("orders").select("id, code, customer_name, total, status, created_at").order("created_at", { ascending: false }).limit(8).then(must),
      count(db.from("products").select("id", { count: "exact", head: true }).eq("is_active", true)),
      count(db.from("orders").select("id", { count: "exact", head: true }).eq("status", "new")),
      count(db.from("subscribers").select("email", { count: "exact", head: true })),
    ]);
    dashData = {
      days,
      daily,
      totals: Object.fromEntries(totals.map((t) => [t.period, t])),
    };
    renderMetricTabs();
    renderLine();

    const stats = [
      ["Đơn mới cần xử lý", newOrders],
      ["Sản phẩm đang bán", activeProducts],
      ["Người đăng ký nhận tin", subscribers],
    ];
    $("#stats").innerHTML = stats.map(([l, v]) => `<div class="stat"><div class="stat__label">${l}</div><div class="stat__value">${esc(v)}</div></div>`).join("");
    $("#recentOrders").innerHTML = ordersTable(orders, false);

    await loadRealtime();
    clearInterval(rtTimer);
    rtTimer = setInterval(() => {
      // Refresh only while the dashboard is visible.
      if ($('[data-panel="dashboard"]').hidden || document.hidden) return;
      loadRealtime().catch(() => {});
    }, 60000);
  }

  /* ---------- Orders ---------- */
  $("#orderFilter").innerHTML = `<option value="">Tất cả trạng thái</option>` + options(STATUS, null);
  $("#orderFilter").addEventListener("change", () => loadOrders().catch((err) => toast(err.message)));

  function ordersTable(orders, editable) {
    const rows = orders.map((o) => `
      <tr class="clickable" data-order="${o.id}">
        <td><strong>${esc(o.code)}</strong></td>
        <td>${dateTime(o.created_at)}</td>
        <td>${esc(o.customer_name)}</td>
        ${editable ? `<td>${esc(o.phone)}</td>` : ""}
        <td>${money(o.total)}</td>
        <td>${editable ? `<select data-status="${o.id}">${options(STATUS, o.status)}</select>` : badge(o.status)}</td>
      </tr>`);
    const head = ["Mã đơn", "Thời gian", "Khách hàng", ...(editable ? ["Điện thoại"] : []), "Tổng tiền", "Trạng thái"];
    return table(head, rows, "Chưa có đơn hàng nào.");
  }

  async function loadOrders() {
    let q = db.from("orders").select("*").order("created_at", { ascending: false }).limit(500);
    const status = $("#orderFilter").value;
    if (status) q = q.eq("status", status);
    $("#ordersTable").innerHTML = ordersTable(must(await q), true);
  }

  // Status change inline; row click opens detail (ignored when clicking the select).
  $("#ordersTable").addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-status]");
    if (!sel) return;
    try {
      must(await db.from("orders").update({ status: sel.value }).eq("id", sel.dataset.status));
      toast("Đã cập nhật trạng thái đơn.");
    } catch (err) {
      toast("Không cập nhật được: " + err.message);
      loadOrders();
    }
  });
  document.addEventListener("click", (e) => {
    const row = e.target.closest("[data-order]");
    if (row && !e.target.closest("select")) openOrder(row.dataset.order).catch((err) => toast(err.message));
  });

  async function openOrder(id) {
    const o = must(await db.from("orders").select("*, order_items(*)").eq("id", id).single());
    const items = o.order_items.map((i) => `
      <tr><td class="wrap">${esc(i.name)}</td><td>${money(i.price)}</td><td>× ${i.qty}</td><td>${money(i.price * i.qty)}</td></tr>`);
    openModal(`
      <h2>Đơn ${esc(o.code)}</h2>
      <dl class="info">
        <dt>Trạng thái</dt><dd>${badge(o.status)}</dd>
        <dt>Thời gian</dt><dd>${dateTime(o.created_at)}</dd>
        <dt>Khách hàng</dt><dd>${esc(o.customer_name)}</dd>
        <dt>Điện thoại</dt><dd><a class="link" href="tel:${esc(o.phone)}">${esc(o.phone)}</a></dd>
        <dt>Email</dt><dd>${esc(o.email) || "—"}</dd>
        <dt>Địa chỉ</dt><dd>${esc(o.address)}</dd>
        <dt>Ghi chú</dt><dd>${esc(o.note) || "—"}</dd>
      </dl>
      ${table(["Sản phẩm", "Đơn giá", "SL", "Thành tiền"], items, "Không có sản phẩm.")}
      <p style="text-align:right;font-size:16px;margin-top:16px">Tổng cộng: <strong>${money(o.total)}</strong></p>`);
  }

  /* ---------- Shared form helpers: image fields with Storage upload ---------- */
  function imageField(name, label, value) {
    return `
      <div class="full img-field">
        <img src="${esc(value || "")}" alt="" data-preview="${name}" ${value ? "" : "hidden"} />
        <div>
          <label>${label}<input name="${name}" value="${esc(value || "")}" placeholder="Dán link ảnh hoặc tải ảnh lên" /></label>
          <input type="file" accept="image/*" data-upload="${name}" aria-label="Tải ${label.toLowerCase()} lên" />
        </div>
      </div>`;
  }

  // Upload to Supabase Storage, then drop the public URL into the matching field.
  // `folder()` names the Storage folder (product id / article slug) at upload time.
  function bindImageUploads(form, folder) {
    form.addEventListener("change", async (e) => {
      const input = e.target.closest("[data-upload]");
      if (!input?.files[0]) return;
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) return toast("Ảnh tối đa 5MB.");
      const field = form.elements.namedItem(input.dataset.upload);
      const path = `${folder() || "misc"}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      try {
        toast("Đang tải ảnh lên...");
        must(await db.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type }));
        const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        // Gallery is a one-URL-per-line textarea: append instead of replacing.
        field.value = field.tagName === "TEXTAREA" ? [field.value.trim(), publicUrl].filter(Boolean).join("\n") : publicUrl;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        toast("Tải ảnh thành công.");
      } catch (err) {
        toast("Không tải được ảnh: " + err.message);
      } finally {
        input.value = "";
      }
    });
    form.addEventListener("input", (e) => {
      const img = form.querySelector(`[data-preview="${e.target.name}"]`);
      if (img) { img.src = e.target.value; img.hidden = !e.target.value; }
    });
  }

  /** Shared submit flow: validate, build row, insert/update, report duplicate keys clearly. */
  function bindSave(form, { table: tbl, isNew, key, keyValue, buildRow, duplicateMsg, onSaved }) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const row = buildRow(Object.fromEntries(new FormData(form)));
        if (isNew) must(await db.from(tbl).insert(row));
        else must(await db.from(tbl).update(row).eq(key, keyValue));
        closeModal();
        toast(isNew ? "Đã tạo mới." : "Đã lưu thay đổi.");
        onSaved();
      } catch (err) {
        form.querySelector(".error").textContent = err.code === "23505" ? duplicateMsg : err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  /* ---------- Products ---------- */
  let products = [];
  const priceText = (n) => (n == null ? "Chưa có giá" : money(n));

  async function loadProducts() {
    products = must(await db.from("products").select("*").order("sort_order").order("created_at"));
    const rows = products.map((p) => `
      <tr>
        <td>${p.img ? `<img class="thumb" src="${esc(p.img)}" alt="" loading="lazy" />` : `<div class="thumb"></div>`}</td>
        <td class="wrap"><strong>${esc(p.name)}</strong><br /><span class="muted">${esc(p.id)}</span></td>
        <td>${esc(p.collection) || "—"}</td>
        <td>${priceText(p.price)}</td>
        <td>${esc(p.size) || "—"}</td>
        <td><label class="check"><input type="checkbox" data-active="${esc(p.id)}"${p.is_active ? " checked" : ""} /> Hiển thị</label></td>
        <td class="row-actions">
          <button class="link" data-edit="${esc(p.id)}">Sửa</button>
          <button class="link" data-delete="${esc(p.id)}">Xoá</button>
        </td>
      </tr>`);
    $("#productsTable").innerHTML = table(["Ảnh", "Tên", "Bộ sưu tập", "Giá", "Dung tích", "Cửa hàng", ""], rows, "Chưa có sản phẩm.");
  }

  $("#productsTable").addEventListener("change", async (e) => {
    const box = e.target.closest("[data-active]");
    if (!box) return;
    try {
      must(await db.from("products").update({ is_active: box.checked }).eq("id", box.dataset.active));
      toast(box.checked ? "Sản phẩm đã hiển thị trên cửa hàng." : "Đã ẩn sản phẩm khỏi cửa hàng.");
    } catch (err) {
      box.checked = !box.checked;
      toast("Không cập nhật được: " + err.message);
    }
  });

  $("#productsTable").addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) return openProductForm(products.find((p) => p.id === edit.dataset.edit));
    const del = e.target.closest("[data-delete]");
    if (!del) return;
    const p = products.find((x) => x.id === del.dataset.delete);
    if (!confirm(`Xoá sản phẩm "${p.name}"? Đơn hàng cũ vẫn giữ tên và giá của sản phẩm này.`)) return;
    try {
      must(await db.from("products").delete().eq("id", p.id));
      toast("Đã xoá sản phẩm.");
      loadProducts();
    } catch (err) {
      toast("Không xoá được: " + err.message);
    }
  });
  $("#addProductBtn").addEventListener("click", () => openProductForm(null));

  // Fields follow the brief's product page. Leave anything unconfirmed empty:
  // the storefront shows "Đang cập nhật", and products without a price cannot be ordered.
  function openProductForm(p) {
    const isNew = !p;
    p = p || { price: null, is_active: true, sort_order: products.length, gallery: [] };
    openModal(`
      <h2>${isNew ? "Thêm sản phẩm" : "Sửa sản phẩm"}</h2>
      <p class="muted">Chỉ điền thông tin đã được thương hiệu xác nhận. Ô để trống sẽ hiển thị "Đang cập nhật".</p>
      <form id="productForm" class="form-grid">
        <label>Mã sản phẩm (đường dẫn) *<input name="id" required pattern="[a-z0-9-]+" maxlength="60" value="${esc(p.id || "")}" ${isNew ? "" : "readonly"} placeholder="vd: com-xanh-ha-noi" /></label>
        <label>Tên sản phẩm *<input name="name" required maxlength="100" value="${esc(p.name || "")}" /></label>
        <label>Giá bán (₫)<input name="price" type="number" min="0" step="1000" value="${p.price ?? ""}" placeholder="Để trống nếu chưa có giá" /></label>
        <label>Dung tích<input name="size" maxlength="40" value="${esc(p.size || "")}" placeholder="vd: 100ml" /></label>
        <label>Vùng đất cảm hứng<input name="region" maxlength="100" value="${esc(p.region || "")}" /></label>
        <label>Bộ sưu tập<input name="collection" maxlength="80" value="${esc(p.collection || "")}" /></label>
        <label>Nhóm hương<input name="scent_family" maxlength="80" value="${esc(p.scent_family || "")}" /></label>
        <label>Thứ tự hiển thị<input name="sort_order" type="number" value="${esc(p.sort_order)}" /></label>
        <label class="full">Các nốt hương đã xác nhận<input name="notes" maxlength="200" value="${esc(p.notes || "")}" /></label>
        <label class="full">Mô tả cảm hứng mùi hương (ngắn)<textarea name="description" rows="2" maxlength="400">${esc(p.description || "")}</textarea></label>
        <label class="full">Câu chuyện đằng sau sản phẩm<textarea name="story" rows="4" maxlength="2000">${esc(p.story || "")}</textarea></label>
        <label class="full">Hướng dẫn sử dụng<textarea name="usage" rows="3" maxlength="1000">${esc(p.usage || "")}</textarea></label>
        <label class="full">Thông tin sản phẩm<textarea name="info" rows="3" maxlength="1000">${esc(p.info || "")}</textarea></label>
        ${imageField("img", "Ảnh chính (toàn cảnh chai)", p.img)}
        ${imageField("img2", "Ảnh nghệ thuật (hiện khi di chuột)", p.img2)}
        <div class="full">
          <label>Ảnh thêm: cận cảnh, bao bì... (mỗi dòng một link)<textarea name="gallery" rows="3">${esc((p.gallery || []).join("\n"))}</textarea></label>
          <input type="file" accept="image/*" data-upload="gallery" aria-label="Tải ảnh thêm lên" />
        </div>
        <label class="check full"><input type="checkbox" name="is_active" ${p.is_active ? "checked" : ""} /> Hiển thị trên cửa hàng</label>
        <p class="error full"></p>
        <div class="form-actions full">
          <button type="button" class="btn btn--ghost" data-close>Huỷ</button>
          <button type="submit" class="btn">${isNew ? "Tạo sản phẩm" : "Lưu thay đổi"}</button>
        </div>
      </form>`);

    const form = $("#productForm");
    bindImageUploads(form, () => form.elements.namedItem("id").value);
    bindSave(form, {
      table: "products", isNew, key: "id", keyValue: p.id,
      duplicateMsg: "Mã sản phẩm đã tồn tại.",
      onSaved: loadProducts,
      buildRow: (f) => ({
        id: f.id.trim(),
        name: f.name.trim(),
        price: f.price === "" ? null : Math.round(Number(f.price)),
        size: f.size.trim(),
        region: f.region.trim(),
        collection: f.collection.trim(),
        scent_family: f.scent_family.trim(),
        notes: f.notes.trim(),
        description: f.description.trim(),
        story: f.story.trim(),
        usage: f.usage.trim(),
        info: f.info.trim(),
        img: f.img.trim() || null,
        img2: f.img2.trim() || null,
        gallery: f.gallery.split("\n").map((s) => s.trim()).filter((s) => /^https?:\/\//.test(s)),
        sort_order: Number(f.sort_order) || 0,
        is_active: form.elements.namedItem("is_active").checked,
      }),
    });
  }

  /* ---------- Journal (articles) ---------- */
  const ARTICLE_CATS = {
    "nghe-thuat-mui-huong": "Nghệ thuật mùi hương",
    "huong-viet-va-ky-uc": "Hương Việt và ký ức",
    "mui-huong-va-ban-sac": "Mùi hương và bản sắc",
    "nhat-ky-sang-tao": "Nhật ký sáng tạo",
  };
  const ARTICLE_STATUS = { draft: "Bản nháp (ẩn)", coming_soon: "Sắp ra mắt", published: "Đã xuất bản" };
  const STATUS_BADGE = { draft: "cancelled", coming_soon: "new", published: "done" };
  let articles = [];

  async function loadArticles() {
    articles = must(await db.from("articles").select("*").order("sort_order").order("created_at"));
    if (!products.length) products = must(await db.from("products").select("id, name").order("sort_order"));
    const rows = articles.map((a) => `
      <tr>
        <td>${a.cover ? `<img class="thumb" src="${esc(a.cover)}" alt="" loading="lazy" />` : `<div class="thumb"></div>`}</td>
        <td class="wrap"><strong>${esc(a.title)}</strong><br /><span class="muted">${esc(a.slug)}</span></td>
        <td>${esc(ARTICLE_CATS[a.category] || a.category)}</td>
        <td><span class="badge badge--${STATUS_BADGE[a.status]}">${esc(ARTICLE_STATUS[a.status])}</span></td>
        <td>${a.published_at ? dateTime(a.published_at) : "—"}</td>
        <td class="row-actions">
          <a class="link" href="../article.html?slug=${encodeURIComponent(a.slug)}" target="_blank" rel="noopener">Xem</a>
          <button class="link" data-edit-article="${a.id}">Sửa</button>
          <button class="link" data-delete-article="${a.id}">Xoá</button>
        </td>
      </tr>`);
    $("#articlesTable").innerHTML = table(["Ảnh bìa", "Tiêu đề", "Chuyên mục", "Trạng thái", "Ngày đăng", ""], rows, "Chưa có bài viết.");
  }

  $("#articlesTable").addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit-article]");
    if (edit) return openArticleForm(articles.find((a) => String(a.id) === edit.dataset.editArticle));
    const del = e.target.closest("[data-delete-article]");
    if (!del) return;
    const a = articles.find((x) => String(x.id) === del.dataset.deleteArticle);
    if (!confirm(`Xoá bài "${a.title}"?`)) return;
    try {
      must(await db.from("articles").delete().eq("id", a.id));
      toast("Đã xoá bài viết.");
      loadArticles();
    } catch (err) {
      toast("Không xoá được: " + err.message);
    }
  });
  $("#addArticleBtn").addEventListener("click", () => openArticleForm(null));

  function openArticleForm(a) {
    const isNew = !a;
    a = a || { category: "huong-viet-va-ky-uc", status: "draft", sort_order: articles.length };
    const productOptions = { "": "(không)", ...Object.fromEntries(products.map((p) => [p.id, p.name])) };
    openModal(`
      <h2>${isNew ? "Viết bài mới" : "Sửa bài viết"}</h2>
      <form id="articleForm" class="form-grid">
        <label class="full">Tiêu đề *<input name="title" required maxlength="160" value="${esc(a.title || "")}" /></label>
        <label>Đường dẫn *<input name="slug" required pattern="[a-z0-9-]+" maxlength="80" value="${esc(a.slug || "")}" placeholder="vd: neu-viet-nam-co-mot-mui-huong" /></label>
        <label>Chuyên mục<select name="category">${options(ARTICLE_CATS, a.category)}</select></label>
        <label>Trạng thái<select name="status">${options(ARTICLE_STATUS, a.status)}</select></label>
        <label>Thời gian đọc (phút)<input name="read_minutes" type="number" min="1" max="120" value="${a.read_minutes ?? ""}" /></label>
        <label>Sản phẩm liên quan<select name="related_product">${options(productOptions, a.related_product || "")}</select></label>
        <label>Thứ tự hiển thị<input name="sort_order" type="number" value="${esc(a.sort_order)}" /></label>
        <label class="full">Mô tả ngắn<textarea name="excerpt" rows="2" maxlength="400">${esc(a.excerpt || "")}</textarea></label>
        ${imageField("cover", "Ảnh bìa (ảnh ngang)", a.cover)}
        <label class="full">Nội dung bài viết
          <textarea name="body" rows="14">${esc(a.body || "")}</textarea>
          <span class="muted">Cách một dòng trống để tách đoạn · <code>## </code> tiêu đề phụ · <code>&gt; </code> trích dẫn nổi bật · <code>![chú thích](link ảnh)</code> chèn ảnh</span>
        </label>
        <div class="full">
          <input type="hidden" name="bodyImage" />
          <input type="file" accept="image/*" data-upload="bodyImage" aria-label="Tải ảnh minh họa cho nội dung" />
          <span class="muted">Tải ảnh minh họa: ảnh sẽ được chèn vào cuối nội dung.</span>
        </div>
        <p class="error full"></p>
        <div class="form-actions full">
          <button type="button" class="btn btn--ghost" data-close>Huỷ</button>
          <button type="submit" class="btn">${isNew ? "Tạo bài viết" : "Lưu thay đổi"}</button>
        </div>
      </form>`);

    const form = $("#articleForm");
    bindImageUploads(form, () => "journal/" + (form.elements.namedItem("slug").value || "draft"));
    // An uploaded body image lands in the hidden field; append it to the body as an image block.
    form.elements.namedItem("bodyImage").addEventListener("input", (e) => {
      const body = form.elements.namedItem("body");
      body.value = `${body.value.trim()}\n\n![](${e.target.value})\n`;
      e.target.value = "";
    });
    bindSave(form, {
      table: "articles", isNew, key: "id", keyValue: a.id,
      duplicateMsg: "Đường dẫn đã được dùng cho bài khác.",
      onSaved: loadArticles,
      buildRow: (f) => ({
        title: f.title.trim(),
        slug: f.slug.trim(),
        category: f.category,
        status: f.status,
        read_minutes: f.read_minutes ? Number(f.read_minutes) : null,
        related_product: f.related_product || null,
        sort_order: Number(f.sort_order) || 0,
        excerpt: f.excerpt.trim(),
        cover: f.cover.trim() || null,
        body: f.body.trim(),
        // First publish stamps the date; later edits keep it.
        published_at: f.status === "published" ? a.published_at || new Date().toISOString() : a.published_at || null,
      }),
    });
  }

  /* ---------- Subscribers ---------- */
  let subscriberEmails = [];
  async function loadSubscribers() {
    const rows = must(await db.from("subscribers").select("*").order("created_at", { ascending: false }));
    subscriberEmails = rows.map((r) => r.email);
    $("#subscribersTable").innerHTML = table(
      ["Email", "Ngày đăng ký", ""],
      rows.map((r) => `<tr><td>${esc(r.email)}</td><td>${dateTime(r.created_at)}</td><td><button class="link" data-unsub="${esc(r.email)}">Xoá</button></td></tr>`),
      "Chưa có ai đăng ký."
    );
  }
  $("#subscribersTable").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-unsub]");
    if (!b || !confirm(`Xoá ${b.dataset.unsub} khỏi danh sách?`)) return;
    try {
      must(await db.from("subscribers").delete().eq("email", b.dataset.unsub));
      loadSubscribers();
    } catch (err) {
      toast(err.message);
    }
  });
  $("#copyEmailsBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(subscriberEmails.join(", "));
      toast(`Đã sao chép ${subscriberEmails.length} email.`);
    } catch {
      toast("Trình duyệt không cho phép sao chép.");
    }
  });

  /* ---------- Boot ---------- */
  db.auth.getSession().then(({ data }) => {
    if (data.session) showApp(data.session).catch((err) => showLogin(err.message));
    else showLogin();
  });
})();
