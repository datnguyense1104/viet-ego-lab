// Minimal SVG charts for the admin dashboard: a period-comparison line chart and a column chart.
// Both redraw on resize and ship a hover tooltip. Colours come from CSS tokens in admin.css.
const Charts = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    return n;
  };

  // Clean axis maximum and 4 tick steps (0 / 25 / 50 / 75 / 100 style).
  function niceScale(max) {
    if (max <= 0) return { top: 4, step: 1 };
    const raw = max / 4;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw);
    return { top: step * 4, step };
  }

  // Tooltip is one absolutely positioned div inside the chart host.
  function tooltip(host) {
    let tip = host.querySelector(".chart-tip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "chart-tip";
      tip.hidden = true;
      host.appendChild(tip);
    }
    return {
      show(html, x, y) {
        tip.innerHTML = html;
        tip.hidden = false;
        const w = tip.offsetWidth;
        const left = Math.min(Math.max(x - w / 2, 0), host.clientWidth - w);
        tip.style.left = `${left}px`;
        tip.style.top = `${Math.max(y - tip.offsetHeight - 12, 0)}px`;
      },
      hide() { tip.hidden = true; },
    };
  }

  // Re-render on container resize; returns the draw function for data updates.
  function responsive(host, draw) {
    let last = 0;
    new ResizeObserver(() => {
      if (host.clientWidth !== last) { last = host.clientWidth; draw(); }
    }).observe(host);
    return draw;
  }

  /**
   * Line chart comparing the current period (solid, accent + area wash) with the
   * previous one (dashed, muted). opts: { labels, current, previous, format, prevLabels }
   */
  function line(host, opts) {
    const draw = () => {
      host.querySelector("svg")?.remove();
      const W = host.clientWidth, H = 240;
      const pad = { t: 12, r: 12, b: 28, l: 56 };
      const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
      const n = opts.current.length;
      const { top, step } = niceScale(Math.max(...opts.current, ...opts.previous));
      const x = (i) => pad.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
      const y = (v) => pad.t + ih - (v / top) * ih;
      const svg = el("svg", { width: W, height: H, role: "img", "aria-label": opts.aria || "" });

      // Recessive hairline grid + y ticks.
      for (let v = 0; v <= top; v += step) {
        svg.append(el("line", { x1: pad.l, x2: W - pad.r, y1: y(v), y2: y(v), class: v === 0 ? "axis" : "grid" }));
        const t = el("text", { x: pad.l - 8, y: y(v) + 4, "text-anchor": "end", class: "tick" });
        t.textContent = opts.format(v, true);
        svg.append(t);
      }
      // X labels: thin out so they never collide (~64px each).
      const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(iw / 64))));
      opts.labels.forEach((l, i) => {
        if (i % every && i !== n - 1) return;
        const t = el("text", { x: x(i), y: H - 8, "text-anchor": "middle", class: "tick" });
        t.textContent = l;
        svg.append(t);
      });

      const path = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join("");
      svg.append(el("path", { d: `${path(opts.current)}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`, class: "area" }));
      svg.append(el("path", { d: path(opts.previous), class: "line line--prev" }));
      svg.append(el("path", { d: path(opts.current), class: "line" }));
      // End dot with surface ring marks "today".
      svg.append(el("circle", { cx: x(n - 1), cy: y(opts.current[n - 1]), r: 4, class: "dot" }));

      // Crosshair + tooltip on hover (hit area = whole plot).
      const cross = el("line", { y1: pad.t, y2: pad.t + ih, class: "cross", visibility: "hidden" });
      const hover = el("circle", { r: 4, class: "dot", visibility: "hidden" });
      svg.append(cross, hover);
      const hit = el("rect", { x: pad.l, y: 0, width: iw, height: H, fill: "transparent" });
      svg.append(hit);
      const tip = tooltip(host);
      hit.addEventListener("pointermove", (e) => {
        const r = svg.getBoundingClientRect();
        const i = Math.max(0, Math.min(n - 1, Math.round(((e.clientX - r.left - pad.l) / iw) * (n - 1))));
        cross.setAttribute("x1", x(i));
        cross.setAttribute("x2", x(i));
        cross.setAttribute("visibility", "visible");
        hover.setAttribute("cx", x(i));
        hover.setAttribute("cy", y(opts.current[i]));
        hover.setAttribute("visibility", "visible");
        tip.show(
          `<div class="chart-tip__row"><i class="key"></i>${opts.labels[i]}<b>${opts.format(opts.current[i])}</b></div>
           <div class="chart-tip__row"><i class="key key--prev"></i>${opts.prevLabels[i]}<b>${opts.format(opts.previous[i])}</b></div>`,
          x(i), y(Math.max(opts.current[i], opts.previous[i]))
        );
      });
      hit.addEventListener("pointerleave", () => {
        cross.setAttribute("visibility", "hidden");
        hover.setAttribute("visibility", "hidden");
        tip.hide();
      });
      host.prepend(svg);
    };
    return responsive(host, draw);
  }

  /** Column chart for the per-minute realtime series. opts: { values, label(i), aria } */
  function columns(host, opts) {
    const draw = () => {
      host.querySelector("svg")?.remove();
      const W = host.clientWidth, H = 72;
      const n = opts.values.length;
      const max = Math.max(1, ...opts.values);
      const slot = W / n;
      const bw = Math.min(24, Math.max(2, slot - 2)); // 2px surface gap between columns
      const svg = el("svg", { width: W, height: H, role: "img", "aria-label": opts.aria || "" });
      svg.append(el("line", { x1: 0, x2: W, y1: H - 0.5, y2: H - 0.5, class: "axis" }));
      const tip = tooltip(host);
      opts.values.forEach((v, i) => {
        const h = v ? Math.max(3, (v / max) * (H - 6)) : 0;
        const bx = i * slot + (slot - bw) / 2;
        if (h) {
          const r = Math.min(4, bw / 2, h);
          // Rounded data-end, square at the baseline.
          svg.append(el("path", {
            class: "col",
            d: `M${bx},${H}V${H - h + r}Q${bx},${H - h} ${bx + r},${H - h}H${bx + bw - r}Q${bx + bw},${H - h} ${bx + bw},${H - h + r}V${H}Z`,
          }));
        }
        // Full-height hit target, wider than the mark.
        const hit = el("rect", { x: i * slot, y: 0, width: slot, height: H, fill: "transparent" });
        hit.addEventListener("pointerenter", () => tip.show(`${opts.label(i)}: <b>${v}</b>`, bx + bw / 2, H - h));
        hit.addEventListener("pointerleave", () => tip.hide());
        svg.append(hit);
      });
      host.prepend(svg);
    };
    return responsive(host, draw);
  }

  return { line, columns };
})();
