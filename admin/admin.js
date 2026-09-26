// Admin dashboard: Supabase Auth login, then orders / products / subscribers management.
// Every write goes through the signed-in user's session; RLS (supabase/schema.sql) only allows
// users listed in public.admins, so hiding UI here is convenience, not security.
(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => Number(n || 0).toLocaleString("vi-VN") + "₫";
  const dateTime = (s) => new Date(s).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

  const STATUS = {
    new: "Mới",
    confirmed: "Đã xác nhận",
    shipping: "Đang giao",
    done: "Hoàn thành",
    cancelled: "Đã huỷ",
  };
  const CATS = { edp: "Eau de Parfum", edt: "Eau de Toilette", set: "Bộ khám phá", home: "Hương thơm không gian" };
  const MOODS = { "": "(không)", "diu-dang": "Dịu dàng", "trong-treo": "Trong trẻo", "am-ap": "Ấm áp", "manh-me": "Mạnh mẽ", "tinh-lang": "Tĩnh lặng" };
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
  const loaders = { dashboard: loadDashboard, orders: loadOrders, products: loadProducts, subscribers: loadSubscribers };
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

  /* ---------- Products ---------- */
  let products = [];
  async function loadProducts() {
    products = must(await db.from("products").select("*").order("sort_order").order("created_at"));
    const rows = products.map((p) => `
      <tr>
        <td>${p.img ? `<img class="thumb" src="${esc(p.img)}" alt="" loading="lazy" />` : `<div class="thumb"></div>`}</td>
        <td class="wrap"><strong>${esc(p.name)}</strong><br /><span class="muted">${esc(p.id)}</span></td>
        <td>${esc(CATS[p.cat] || p.cat)}</td>
        <td>${money(p.price)}</td>
        <td>${esc(p.size)}</td>
        <td><label class="check"><input type="checkbox" data-active="${esc(p.id)}"${p.is_active ? " checked" : ""} /> Đang bán</label></td>
        <td class="row-actions">
          <button class="link" data-edit="${esc(p.id)}">Sửa</button>
          <button class="link" data-delete="${esc(p.id)}">Xoá</button>
        </td>
      </tr>`);
    $("#productsTable").innerHTML = table(["Ảnh", "Tên", "Danh mục", "Giá", "Dung tích", "Hiển thị", ""], rows, "Chưa có sản phẩm.");
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

  function openProductForm(p) {
    const isNew = !p;
    p = p || { cat: "edp", price: 0, hue: 90, is_active: true, sort_order: products.length };
    openModal(`
      <h2>${isNew ? "Thêm sản phẩm" : "Sửa sản phẩm"}</h2>
      <form id="productForm" class="form-grid">
        <label>Mã sản phẩm *<input name="id" required pattern="[a-z0-9-]+" maxlength="60" value="${esc(p.id || "")}" ${isNew ? "" : "readonly"} placeholder="vd: edp-com" /></label>
        <label>Tên *<input name="name" required maxlength="100" value="${esc(p.name || "")}" /></label>
        <label>Danh mục<select name="cat">${options(CATS, p.cat)}</select></label>
        <label>Vùng đất<input name="region" maxlength="100" value="${esc(p.region || "")}" /></label>
        <label>Giá (₫) *<input name="price" type="number" min="0" step="1000" required value="${esc(p.price)}" /></label>
        <label>Dung tích<input name="size" maxlength="40" value="${esc(p.size || "")}" placeholder="vd: 50ml" /></label>
        <label>Cảm xúc (Tìm hương)<select name="mood">${options(MOODS, p.mood || "")}</select></label>
        <label>Thứ tự hiển thị<input name="sort_order" type="number" value="${esc(p.sort_order)}" /></label>
        <label class="full">Tầng hương<input name="notes" maxlength="200" value="${esc(p.notes || "")}" placeholder="vd: Cốm non · Lá sen · Xạ hương" /></label>
        <label class="full">Câu chuyện<textarea name="story" rows="3" maxlength="600">${esc(p.story || "")}</textarea></label>
        ${imageField("img", "Ảnh chính", p.img)}
        ${imageField("img2", "Ảnh khi di chuột", p.img2)}
        <label class="check full"><input type="checkbox" name="is_active" ${p.is_active ? "checked" : ""} /> Hiển thị trên cửa hàng</label>
        <p class="error full" id="productError"></p>
        <div class="form-actions full">
          <button type="button" class="btn btn--ghost" data-close>Huỷ</button>
          <button type="submit" class="btn">${isNew ? "Tạo sản phẩm" : "Lưu thay đổi"}</button>
        </div>
      </form>`);

    const form = $("#productForm");
    // Upload to Supabase Storage, then drop the public URL into the matching text field.
    form.addEventListener("change", async (e) => {
      const input = e.target.closest("[data-upload]");
      if (!input?.files[0]) return;
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) return toast("Ảnh tối đa 5MB.");
      const field = input.dataset.upload;
      // form.elements.id, not form.id (that is the <form>'s own id attribute).
      const path = `${form.elements.namedItem("id").value || "product"}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      try {
        toast("Đang tải ảnh lên...");
        must(await db.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type }));
        const publicUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        form[field].value = publicUrl;
        form[field].dispatchEvent(new Event("input", { bubbles: true }));
        toast("Tải ảnh thành công.");
      } catch (err) {
        toast("Không tải được ảnh: " + err.message);
      }
    });
    form.addEventListener("input", (e) => {
      const img = form.querySelector(`[data-preview="${e.target.name}"]`);
      if (img) { img.src = e.target.value; img.hidden = !e.target.value; }
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const f = Object.fromEntries(new FormData(form));
      const row = {
        id: f.id.trim(),
        name: f.name.trim(),
        cat: f.cat,
        region: f.region.trim(),
        mood: f.mood,
        notes: f.notes.trim(),
        story: f.story.trim(),
        price: Math.round(Number(f.price)),
        size: f.size.trim(),
        sort_order: Number(f.sort_order) || 0,
        img: f.img.trim() || null,
        img2: f.img2.trim() || null,
        is_active: form.is_active.checked,
      };
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        if (isNew) must(await db.from("products").insert(row));
        else must(await db.from("products").update(row).eq("id", row.id));
        closeModal();
        toast(isNew ? "Đã tạo sản phẩm." : "Đã lưu thay đổi.");
        loadProducts();
      } catch (err) {
        $("#productError").textContent = err.code === "23505" ? "Mã sản phẩm đã tồn tại." : err.message;
      } finally {
        btn.disabled = false;
      }
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
