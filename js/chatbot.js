// Floating scent-assistant chat. Loaded by layout.js on every storefront page; talks to /api/chat,
// which streams plain text. The conversation lives in sessionStorage so it survives page changes.
(() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const KEY = "chat";
  const GREETING = "Xin chào! Mình là trợ lý mùi hương của Việt Ego Lab. Bạn muốn tìm hiểu về các mùi hương, kiến thức nước hoa, hay cần mình gợi ý mùi hợp với bạn?";
  const SUGGESTIONS = ["Gợi ý mùi hương hợp với mình", "Việt Ego Lab có những mùi nào?", "Xịt nước hoa sao cho lâu thơm?"];
  const ICON = {
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4V5z"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    send: '<svg viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2-7-8-1z"/></svg>',
  };

  let history = [];
  try { history = JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { history = []; }
  const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(history.slice(-30))); } catch { /* storage blocked */ } };

  /** Minimal, safe formatting for bot replies: escape, then **bold**, "- " bullets and line breaks. */
  function format(text) {
    return esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/^\s*[-*•]\s+/gm, "• ")
      .replace(/\n/g, "<br>");
  }

  document.body.insertAdjacentHTML("beforeend", `
    <button class="chat-fab" id="chatOpen" aria-label="Mở trợ lý mùi hương" aria-expanded="false">${ICON.chat}<span>Trợ lý mùi hương</span></button>
    <section class="chat" id="chat" role="dialog" aria-label="Trợ lý mùi hương Việt Ego Lab" hidden>
      <header class="chat__head">
        <div><strong>Trợ lý mùi hương</strong><small>Việt Ego Lab · AI</small></div>
        <button class="icon-btn" id="chatClose" aria-label="Đóng trợ lý">${ICON.close}</button>
      </header>
      <div class="chat__log" id="chatLog" aria-live="polite"></div>
      <div class="chat__chips" id="chatChips"></div>
      <form class="chat__form" id="chatForm">
        <input name="q" maxlength="800" autocomplete="off" placeholder="Hỏi về mùi hương..." aria-label="Câu hỏi" required />
        <button class="chat__send" aria-label="Gửi">${ICON.send}</button>
      </form>
      <p class="chat__note">Trợ lý AI có thể nhầm lẫn – thông tin chính thức xem tại trang sản phẩm.</p>
    </section>`);

  const $ = (id) => document.getElementById(id);
  const panel = $("chat"), log = $("chatLog"), form = $("chatForm"), input = form.elements.q, fab = $("chatOpen");
  let busy = false;

  const bubble = (role, html) => {
    log.insertAdjacentHTML("beforeend", `<div class="chat__msg chat__msg--${role}">${html}</div>`);
    log.scrollTop = log.scrollHeight;
    return log.lastElementChild;
  };

  function render() {
    log.innerHTML = "";
    bubble("bot", format(GREETING));
    history.forEach((m) => bubble(m.role === "user" ? "user" : "bot", m.role === "user" ? esc(m.content) : format(m.content)));
    $("chatChips").innerHTML = history.length ? "" : SUGGESTIONS.map((s) => `<button type="button">${esc(s)}</button>`).join("");
  }

  function toggle(open) {
    panel.hidden = !open;
    fab.setAttribute("aria-expanded", String(open));
    fab.classList.toggle("is-hidden", open);
    if (open) { log.scrollTop = log.scrollHeight; input.focus(); }
  }

  async function ask(question) {
    if (busy || !question.trim()) return;
    busy = true;
    form.classList.add("is-busy");
    history.push({ role: "user", content: question.trim() });
    save();
    $("chatChips").innerHTML = "";
    bubble("user", esc(question.trim()));
    const out = bubble("bot", '<span class="chat__typing"><i></i><i></i><i></i></span>');
    let answer = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Trợ lý đang bận, bạn thử lại sau nhé.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        out.innerHTML = format(answer);
        log.scrollTop = log.scrollHeight;
      }
      history.push({ role: "assistant", content: answer });
      save();
    } catch (err) {
      out.innerHTML = esc(err.message || "Không kết nối được, bạn thử lại nhé.");
      out.classList.add("chat__msg--error");
      history.pop(); // let the user resend the same question
      save();
    } finally {
      busy = false;
      form.classList.remove("is-busy");
    }
  }

  fab.addEventListener("click", () => toggle(true));
  $("chatClose").addEventListener("click", () => toggle(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !panel.hidden) toggle(false); });
  $("chatChips").addEventListener("click", (e) => { if (e.target.matches("button")) ask(e.target.textContent); });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = input.value;
    input.value = "";
    ask(q);
  });
  render();
})();
