/* ============ SCHOOL SCHEDULE CALENDAR ============ */
(function () {
  /* ---------- SETTINGS (edit here) ---------- */
  // The Monday when week 1 of the rotation starts (format: YYYY-MM-DD). Must be a Monday.
  // (These come from config.js. The values here are only a safety net if that file is missing.)
  const ROT = (window.IPT_CONFIG && window.IPT_CONFIG.rotation) || {};
  const CYCLE_START = ROT.cycleStart || "2026-10-05";

  // Year 6 rotation: one entry per Monday, repeating forever.
  const YEAR6 = (Array.isArray(ROT.year6) && ROT.year6.length) ? ROT.year6 : [
    ["Antalya", "Ataşehir"],
    ["Bahçeşehir", "Bornova"],
    ["Bursa", "Çamlıca"],
    ["Çayyolu", "Çukurambar"],
    ["Esenşehir", "İncek"],
    ["Maslak", "Sancaktepe", "Kurtköy"]
  ];
  // Year 7 uses the same list starting from the bottom.
  const YEAR7 = YEAR6.slice().reverse();

  /* ---------- STYLES ---------- */
  const css = `
  .cal-panel{position:relative;color:var(--t-label);display:flex;flex-direction:column;flex:1;width:100%;min-width:0;padding:.9rem 1rem}
  .cal-head{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.5rem}
  .cal-head h2{margin:0;font-size:18px;font-weight:700;color:var(--t-title);text-align:center;flex:1}
  .cal-nav{width:34px;height:34px;border-radius:10px;border:1px solid var(--edge);background:rgba(255,255,255,.12);color:var(--t-title);font-size:18px;line-height:1;display:grid;place-items:center;padding:0}
  .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px}
  .cal-dow{text-align:center;font-size:12px;font-weight:600;color:var(--t-help);padding:2px 0}
  .cal-cell{aspect-ratio:1/1;max-height:64px;display:grid;place-items:center;border-radius:10px;font-size:13px;color:var(--t-label);background:transparent;border:1px solid transparent;font-family:inherit;padding:0}
  .cal-monday{background:rgba(121,235,221,.2);border-color:rgba(121,235,221,.55);font-weight:700;cursor:pointer}
  .cal-monday:hover,.cal-monday:focus-visible{background:rgba(121,235,221,.38)}
  .cal-week{background:linear-gradient(135deg,#52d9ca,#658ff1);color:#06214e;border-color:transparent;box-shadow:0 0 0 3px rgba(121,235,221,.35)}
  .cal-week:hover,.cal-week:focus-visible{background:linear-gradient(135deg,#52d9ca,#658ff1)}
  .cal-today{outline:2px solid #ffd54a;outline-offset:2px}
  .cal-today:not(.cal-monday){background:rgba(255,213,74,.16);font-weight:700}
  .cal-legend{display:flex;flex-wrap:wrap;gap:.25rem 1rem;margin-top:.5rem;font-size:12px;color:var(--t-help)}
  .cal-legend span{display:inline-flex;align-items:center;gap:.45rem}
  .cal-legend i{width:13px;height:13px;border-radius:5px;display:inline-block}
  .cal-tip{position:absolute;z-index:30;transform:translate(-50%,-100%);min-width:200px;max-width:270px;padding:.7rem .9rem;border-radius:14px;background:rgba(3,14,44,.96);border:1px solid var(--edge);color:#eef5ff;font-size:14px;line-height:1.5;pointer-events:none;box-shadow:0 12px 30px rgba(0,0,0,.35)}
  .cal-tip[hidden]{display:none}
  .cal-tip b{color:#9decE5}

  /* --- Animations: days pop in one after another, months slide --- */
  .page-ready .cal-grid .cal-cell[style]{animation:calPop .42s cubic-bezier(.2,.8,.2,1) calc(var(--d,0)*16ms + 60ms) backwards}
  .cal-grid.cal-out-l{animation:calOutL .13s ease-in forwards}
  .cal-grid.cal-out-r{animation:calOutR .13s ease-in forwards}
  .cal-grid.cal-in-l{animation:calInL .34s cubic-bezier(.2,.8,.2,1)}
  .cal-grid.cal-in-r{animation:calInR .34s cubic-bezier(.2,.8,.2,1)}
  .cal-head h2.cal-title-l{animation:calTitleL .34s cubic-bezier(.2,.8,.2,1)}
  .cal-head h2.cal-title-r{animation:calTitleR .34s cubic-bezier(.2,.8,.2,1)}
  @keyframes calPop{from{opacity:0;transform:scale(.55) translateY(6px)}to{opacity:1;transform:none}}
  @keyframes calOutL{to{opacity:0;transform:translateX(-26px)}}
  @keyframes calOutR{to{opacity:0;transform:translateX(26px)}}
  @keyframes calInL{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:none}}
  @keyframes calInR{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:none}}
  @keyframes calTitleL{from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:none}}
  @keyframes calTitleR{from{opacity:0;transform:translateX(-18px)}to{opacity:1;transform:none}}
  @media(prefers-reduced-motion:reduce){.page-ready .cal-grid .cal-cell[style],.cal-grid.cal-out-l,.cal-grid.cal-out-r,.cal-grid.cal-in-l,.cal-grid.cal-in-r,.cal-head h2{animation:none!important}}
  @media(min-width:1024px){#cal-grid{flex:1;min-height:0;grid-auto-rows:minmax(24px,1fr)}.cal-panel .cal-cell{aspect-ratio:auto;max-height:none}}
  @media(max-width:640px){.cal-cell{font-size:14px;border-radius:10px}.cal-grid{gap:4px}}`;

  /* ---------- HELPERS ---------- */
  const DAY = 864e5;
  const dn = d => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY);
  const [sy, sm, sd] = CYCLE_START.split("-").map(Number);
  const startN = Date.UTC(sy, sm - 1, sd) / DAY;
  const fmt = (d, o) => d.toLocaleDateString("en-GB", o);

  function schools(date) {           // returns the schools for a Monday, or null
    const w = dn(date) - startN;
    if (w < 0 || w % 7 !== 0) return null;
    const i = (w / 7) % YEAR6.length;
    return { y6: YEAR6[i], y7: YEAR7[i] };
  }

  /* ---------- BUILD ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    const menu = document.getElementById("menu-view");
    if (!menu) return;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    const now = new Date();
    const todayN = dn(now);
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    const weekN = dn(thisMonday);
    let view = now < new Date(sy, sm - 1, sd) ? new Date(sy, sm - 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);

    const wrap = document.createElement("section");
    wrap.className = "mx-auto max-w-5xl mt-6";
    wrap.setAttribute("aria-label", "Feedback schedule");
    wrap.innerHTML = `
      <div class="glass-panel cal-panel rounded-[28px]">
        <div class="cal-head">
          <button type="button" class="cal-nav" id="cal-prev" aria-label="Previous month">‹</button>
          <h2 id="cal-title"></h2>
          <button type="button" class="cal-nav" id="cal-next" aria-label="Next month">›</button>
        </div>
        <div class="cal-grid" id="cal-dows"></div>
        <div class="cal-grid" id="cal-grid" style="margin-top:4px"></div>
        <div class="cal-legend">
          <span><i style="background:rgba(121,235,221,.35);border:1px solid rgba(121,235,221,.7)"></i>Feedback Monday (hover or tap)</span>
          <span><i style="background:linear-gradient(135deg,#52d9ca,#658ff1)"></i>This week's Monday</span>
          <span><i style="border:2px solid #ffd54a"></i>Today</span>
        </div>
        <div class="cal-tip" id="cal-tip" hidden></div>
      </div>`;
    const mount = document.getElementById("schedule");
    if (mount) { wrap.className = ""; wrap.style.cssText = "display:flex;flex:1;min-width:0"; mount.appendChild(wrap); }
    else menu.appendChild(wrap);

    const grid = wrap.querySelector("#cal-grid"), tip = wrap.querySelector("#cal-tip"), panel = wrap.querySelector(".cal-panel");
    wrap.querySelector("#cal-dows").innerHTML = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<div class="cal-dow">${d}</div>`).join("");

    const line = (label, arr) => `<div><b>${label}</b> ${arr.join(", ")}</div>`;

    function hide() { tip.hidden = true; }
    function show(btn) {
      const [yy, mm, dd] = btn.dataset.date.split("-").map(Number);
      const date = new Date(yy, mm - 1, dd), s = schools(date);
      if (!s) return;
      tip.innerHTML = `<strong>${fmt(date, { weekday: "long", day: "numeric", month: "long" })}</strong>${line("Year 6", s.y6)}${line("Year 7", s.y7)}`;
      tip.hidden = false;
      const w = tip.offsetWidth;
      const cx = btn.offsetLeft + btn.offsetWidth / 2;   // position inside the panel (not affected by page scaling)
      const left = Math.min(Math.max(cx, w / 2 + 8), panel.clientWidth - w / 2 - 8);
      tip.style.left = left + "px";
      tip.style.top = (btn.offsetTop - 8) + "px";
    }

    const title = wrap.querySelector("#cal-title");
    const restart = (el, cls, all) => { el.classList.remove(...all); void el.offsetWidth; el.classList.add(cls); };
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function render(dir) {                      // dir: 1 = moved forward, -1 = moved back, undefined = first draw
      hide();
      const y = view.getFullYear(), m = view.getMonth();
      wrap.querySelector("#cal-title").textContent = fmt(view, { month: "long", year: "numeric" });
      const offset = (new Date(y, m, 1).getDay() + 6) % 7;
      const days = new Date(y, m + 1, 0).getDate();
      let html = "";
      for (let i = 0; i < offset; i++) html += '<span class="cal-cell"></span>';
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d), n = dn(date);
        const isMonday = date.getDay() === 1 && schools(date);
        const cls = ["cal-cell"];
        if (isMonday) cls.push("cal-monday");
        if (isMonday && n === weekN) cls.push("cal-week");
        if (n === todayN) cls.push("cal-today");
        html += isMonday
          ? `<button type="button" class="${cls.join(" ")}" style="--d:${d}" data-date="${y}-${m + 1}-${d}">${d}</button>`
          : `<span class="${cls.join(" ")}" style="--d:${d}">${d}</span>`;
      }
      // always draw 6 weeks so the calendar never changes height between months
      for (let i = offset + days; i < 42; i++) html += '<span class="cal-cell"></span>';
      grid.innerHTML = html;
      if (dir && !reduce) {
        restart(grid, dir > 0 ? "cal-in-l" : "cal-in-r", ["cal-in-l", "cal-in-r", "cal-out-l", "cal-out-r"]);
        restart(title, dir > 0 ? "cal-title-l" : "cal-title-r", ["cal-title-l", "cal-title-r"]);
      }
    }

    let busy = false;
    function go(delta) {                        // slide the old month out, then the new one in
      if (busy) return;
      if (reduce) { view = new Date(view.getFullYear(), view.getMonth() + delta, 1); render(); return; }
      busy = true; hide();
      restart(grid, delta > 0 ? "cal-out-l" : "cal-out-r", ["cal-in-l", "cal-in-r", "cal-out-l", "cal-out-r"]);
      setTimeout(() => {
        view = new Date(view.getFullYear(), view.getMonth() + delta, 1);
        render(delta);
        busy = false;
      }, 130);
    }

    grid.addEventListener("mouseover", e => { const b = e.target.closest(".cal-monday"); if (b) show(b); });
    grid.addEventListener("mouseout", e => { if (e.target.closest(".cal-monday")) hide(); });
    grid.addEventListener("focusin", e => { const b = e.target.closest(".cal-monday"); if (b) show(b); });
    grid.addEventListener("focusout", hide);
    grid.addEventListener("click", e => { const b = e.target.closest(".cal-monday"); if (b) show(b); });
    document.addEventListener("click", e => { if (!e.target.closest(".cal-monday")) hide(); });
    wrap.querySelector("#cal-prev").addEventListener("click", () => go(-1));
    wrap.querySelector("#cal-next").addEventListener("click", () => go(1));

    /* ---------- "FEEDBACK THIS WEEK" BOX ---------- */
    // Shows the schools for the next Monday (today, if today is Monday).
    // From Tuesday on it switches to the following Monday.
    const box = document.getElementById("feedback-week");
    if (box) {
      let up = new Date(now.getFullYear(), now.getMonth(), now.getDate() + ((8 - now.getDay()) % 7));
      if (dn(up) < startN) up = new Date(sy, sm - 1, sd);   // before the rotation starts
      const u = schools(up);
      if (u) {
        box.innerHTML =
          `<div class="fw-head"><span class="fw-title">Feedback this week</span><span class="fw-date">${fmt(up, { weekday: "short", day: "numeric", month: "short" })}</span></div>` +
          `<div class="fw-row"><span class="fw-chip fw-chip-6">Year 6</span><span class="fw-schools">${u.y6.join(", ")}</span></div>` +
          `<div class="fw-row"><span class="fw-chip fw-chip-7">Year 7</span><span class="fw-schools">${u.y7.join(", ")}</span></div>`;
      }
    }
    render();
  });
})();
