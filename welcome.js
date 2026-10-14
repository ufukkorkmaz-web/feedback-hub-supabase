/* IPT Feedback · Created by Ufuk Korkmaz, 2026. */
/* ============================================================================
   Welcome: right after the Saturn intro, a glass box asks "What should I call
   you?". Then a 3-second welcome screen greets the teacher by name, and every
   later visit starts with "Welcome back, ...!".
   The name is kept only in this browser (localStorage). It is never sent
   anywhere and is not part of the feedback.
   ============================================================================ */
(function () {
  "use strict";
  var KEY = "ipt-name", SKIPPED = "ipt-name-skipped", SHOW_MS = 1500;
  var reduce = function () { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; };

  function read(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
  function write(k, v) { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch (e) {} }
  function clean(s) { return String(s || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 30); }
  function getName() { return clean(read(KEY)); }

  var SATURN = '<svg class="ws-saturn" viewBox="0 0 200 140" aria-hidden="true"><defs>' +
    '<radialGradient id="ws-body" cx="34%" cy="28%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#bff7ee" stop-opacity=".45"/><stop offset="1" stop-color="#5a78ff" stop-opacity=".35"/></radialGradient>' +
    '<linearGradient id="ws-ring" x1="0" x2="1"><stop offset="0" stop-color="#79ebdd" stop-opacity=".1"/><stop offset=".5" stop-color="#eaffff" stop-opacity=".95"/><stop offset="1" stop-color="#9bb2ff" stop-opacity=".1"/></linearGradient>' +
    '<linearGradient id="ws-sheen" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
    '<clipPath id="ws-clip"><circle cx="100" cy="70" r="34"/></clipPath></defs>' +
    '<g transform="rotate(-18 100 70)">' +
    '<path d="M16 70A84 20 0 0 1 184 70" fill="none" stroke="url(#ws-ring)" stroke-width="5" opacity=".6"/>' +
    '<path d="M34 70A66 15.5 0 0 1 166 70" fill="none" stroke="url(#ws-ring)" stroke-width="1.6"/>' +
    '<circle cx="100" cy="70" r="34" fill="url(#ws-body)" stroke="rgba(225,244,255,.55)" stroke-width="1.2"/>' +
    '<g clip-path="url(#ws-clip)"><g class="saturn-sheen"><rect x="46" y="30" width="18" height="80" fill="url(#ws-sheen)" transform="skewX(-18)"/></g></g>' +
    '<ellipse cx="88" cy="56" rx="9" ry="4.5" fill="#fff" opacity=".55" transform="rotate(-25 88 56)"/>' +
    '<path d="M16 70A84 20 0 0 0 184 70" fill="none" stroke="url(#ws-ring)" stroke-width="5" opacity=".75"/>' +
    '<path d="M34 70A66 15.5 0 0 0 166 70" fill="none" stroke="url(#ws-ring)" stroke-width="1.6"/></g></svg>';

  function addStyles() {
    if (document.getElementById("ws-css")) return;
    var s = document.createElement("style"); s.id = "ws-css";
    s.textContent =
      "@property --ws-angle{syntax:'<angle>';inherits:false;initial-value:0deg}" +
      ".ws-overlay{position:fixed;inset:0;z-index:9990;display:grid;place-items:center;padding:1rem;overflow:auto;opacity:0;transition:opacity .45s ease;" +
        "background:rgba(2,12,39,.42);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}" +
      ".ws-overlay.show{opacity:1}" +
      ".ws-overlay.splash{background:radial-gradient(circle at 50% 42%,rgba(121,235,221,.34),transparent 38%),radial-gradient(circle at 16% 14%,rgba(114,242,217,.34),transparent 28%),radial-gradient(circle at 86% 18%,rgba(151,182,255,.34),transparent 28%),linear-gradient(135deg,#020c27,#173067);-webkit-backdrop-filter:none;backdrop-filter:none}" +
      ".ws-card{width:min(100%,27rem);padding:1.9rem 1.6rem 1.5rem;border-radius:28px;text-align:center;color:#eef5ff;" +
        "background:linear-gradient(150deg,rgba(38,92,170,.62),rgba(10,28,72,.82));border:1px solid rgba(255,255,255,.22);" +
        "box-shadow:0 26px 70px rgba(1,10,37,.55),0 0 40px rgba(82,217,202,.20),inset 0 1px 0 rgba(255,255,255,.2);transform:translateY(16px) scale(.96);transition:transform .5s cubic-bezier(.2,.8,.2,1)}" +
      ".ws-overlay.show .ws-card{transform:none}" +
      ".ws-card .ws-saturn{width:5.2rem;height:auto;margin:-.2rem auto .5rem;display:block;filter:drop-shadow(0 0 16px rgba(121,235,221,.5))}" +
      ".ws-kicker{margin:0;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#79ebdd;font-weight:700}" +
      ".ws-title{margin:.35rem 0 0;font-family:Fraunces,Georgia,serif;font-weight:700;font-size:30px;line-height:1.15}" +
      ".ws-field{position:relative;margin:1.4rem 0 0;border-radius:18px;padding:2px;background:conic-gradient(from var(--ws-angle,0deg),#3fc7ff,#36d9c5,#fff,#a9d2ff,#3fc7ff);animation:wsSpin 6s linear infinite;box-shadow:0 0 22px rgba(63,199,255,.35)}" +
      "@keyframes wsSpin{to{--ws-angle:360deg}}" +
      ".ws-field input{display:block;width:100%;border:0;outline:0;border-radius:16px;padding:.95rem 1.1rem;font:600 20px Work Sans,system-ui,sans-serif;text-align:center;color:#fff;background:#0b1d4d;caret-color:#79ebdd}" +
      ".ws-field input::placeholder{color:#8fa6d6;font-weight:500}" +
      ".ws-go{margin-top:1rem;width:100%;border:0;border-radius:16px;padding:.85rem 1rem;font:700 17px Work Sans,system-ui,sans-serif;cursor:pointer;color:#06214e;background:linear-gradient(135deg,#52d9ca,#658ff1);box-shadow:0 10px 26px rgba(0,0,0,.28);transition:transform .15s ease,filter .15s ease}" +
      ".ws-go:hover{transform:translateY(-2px);filter:brightness(1.07)}" +
      ".ws-go:disabled{opacity:.55;cursor:default;transform:none;filter:none}" +
      ".ws-skip{margin-top:.8rem;background:none;border:0;color:#b7c7e6;font:500 14px Work Sans,system-ui,sans-serif;cursor:pointer;text-decoration:underline;text-underline-offset:3px}" +
      ".ws-priv{margin:.9rem 0 0;font-size:12.5px;color:#9fb3da}" +
      ".ws-go:focus-visible,.ws-skip:focus-visible,.ws-field input:focus-visible{outline:3px solid #52d9ca;outline-offset:2px}" +
      ".ws-splash{text-align:center;color:#fff;padding:1rem}" +
      ".ws-splash .ws-saturn{width:min(34vw,9rem);height:auto;display:block;margin:0 auto 1.2rem;filter:drop-shadow(0 0 26px rgba(121,235,221,.55));animation:wsIn 1s cubic-bezier(.2,.8,.2,1) both}" +
      "@keyframes wsIn{0%{opacity:0;transform:scale(.6) rotate(-180deg)}40%{opacity:1}100%{opacity:1;transform:none}}" +
      ".ws-line{margin:0;font-family:Fraunces,Georgia,serif;font-weight:600;font-size:clamp(20px,4.2vw,30px);letter-spacing:.2em;text-transform:uppercase;white-space:nowrap;animation:wsUp .8s cubic-bezier(.2,.8,.2,1) .35s both}" +
      ".ws-hello{color:#d6e2fb}" +
      ".ws-name{color:#fff;text-shadow:0 0 12px rgba(255,255,255,.6),0 0 30px rgba(121,235,221,.8),0 0 64px rgba(101,143,241,.7);animation:wsGlow 2.2s ease-in-out 1.2s infinite alternate}" +
      "@keyframes wsUp{from{opacity:0;transform:translateY(18px) scale(.96)}to{opacity:1;transform:none}}" +
      "@keyframes wsGlow{from{filter:brightness(1)}to{filter:brightness(1.22)}}" +
      ".ws-whoami{position:fixed;left:12px;bottom:12px;z-index:9600;display:none;align-items:center;gap:0;height:22px;min-width:22px;padding:0 5px;border-radius:999px;font:500 13px Work Sans,system-ui,sans-serif;color:#d6e2fb;cursor:pointer;white-space:nowrap;overflow:hidden;" +
        "background:rgba(10,28,72,.45);border:1px solid rgba(255,255,255,.25);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:gap .3s ease,padding .3s ease,background .2s ease}" +
      ".ws-whoami .ws-dot{flex:none;width:10px;height:10px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#79ebdd 60%,#658ff1);box-shadow:0 0 8px rgba(121,235,221,.7)}" +
      ".ws-whoami .ws-lbl{max-width:0;opacity:0;overflow:hidden;transition:max-width .35s ease,opacity .25s ease}" +
      ".ws-whoami:hover,.ws-whoami:focus-visible,.ws-whoami.open{gap:.5rem;padding:0 .8rem 0 .6rem;color:#fff;background:rgba(10,28,72,.8)}" +
      ".ws-whoami:hover .ws-lbl,.ws-whoami:focus-visible .ws-lbl,.ws-whoami.open .ws-lbl{max-width:260px;opacity:1}" +
      ".ws-whoami:focus-visible{outline:3px solid #52d9ca;outline-offset:2px}" +
      "body:has(#menu-view.active) .ws-whoami{display:inline-flex}" +
      "@media (prefers-reduced-motion:reduce){.ws-overlay,.ws-card{transition:none}.ws-field{animation:none}.ws-splash .ws-saturn,.ws-line,.ws-name{animation:none}}";
    document.head.appendChild(s);
  }

  function makeOverlay() {
    var o = document.createElement("div"); o.className = "ws-overlay"; document.body.appendChild(o);
    requestAnimationFrame(function () { requestAnimationFrame(function () { o.classList.add("show"); }); });
    return o;
  }
  function removeOverlay(o, then) {
    o.classList.remove("show"); setTimeout(function () { o.remove(); if (then) then(); }, reduce() ? 0 : 480);
  }

  // Step 1: the glass box that asks for a name. done(name) gets "" when the teacher skips.
  function askName(o, current, done) {
    o.className = "ws-overlay"; o.classList.add("show");
    o.innerHTML =
      '<div class="ws-card" role="dialog" aria-modal="true" aria-labelledby="ws-title">' + SATURN +
      '<p class="ws-kicker">Before we begin</p><h2 class="ws-title" id="ws-title">What should I call you?</h2>' +
      '<form class="ws-form" novalidate><div class="ws-field"><input id="ws-in" type="text" maxlength="30" autocomplete="given-name" autocapitalize="words" spellcheck="false" placeholder="Your first name" aria-label="Your first name"></div>' +
      '<button class="ws-go" type="submit" disabled>Continue</button></form>' +
      '<button type="button" class="ws-skip">Skip for now</button>' +
      '<p class="ws-priv">Saved only on this device. It is never sent with your feedback.</p></div>';
    var input = o.querySelector("#ws-in"), go = o.querySelector(".ws-go"), skip = o.querySelector(".ws-skip"), form = o.querySelector("form"), finished = false;
    input.value = current || ""; go.disabled = !clean(input.value);
    input.addEventListener("input", function () { go.disabled = !clean(input.value); });
    function finish(v) { if (finished) return; finished = true; document.removeEventListener("keydown", onKey, true); done(v); }
    form.addEventListener("submit", function (e) { e.preventDefault(); var v = clean(input.value); if (v) finish(v); else input.focus(); });
    skip.addEventListener("click", function () { finish(""); });
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); finish(""); return; }
      if (e.key === "Tab") {
        var f = [input, go.disabled ? null : go, skip].filter(Boolean), i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
      }
    }
    document.addEventListener("keydown", onKey, true);
    setTimeout(function () { try { input.focus({ preventScroll: true }); input.select(); } catch (e) {} }, 350);
  }

  // Step 2: the 3-second welcome screen. onStartFade() fires as it begins to fade, so the page can rise in underneath.
  function splash(o, name, back, onStartFade) {
    o.className = "ws-overlay splash"; o.classList.add("show");
    o.innerHTML = '<div class="ws-splash" role="status">' + SATURN + '<p class="ws-line"><span class="ws-hello"></span> <span class="ws-name"></span></p></div>';
    o.querySelector(".ws-hello").textContent = back ? "Welcome back," : "Welcome,";
    o.querySelector(".ws-name").textContent = name + "!";
    (function fit(){
      var el = o.querySelector(".ws-line"), max = window.innerWidth * 0.9;
      el.style.display = "inline-block";
      var w = el.getBoundingClientRect().width, fs = parseFloat(getComputedStyle(el).fontSize);
      if (w > max) { el.style.letterSpacing = ".06em"; w = el.getBoundingClientRect().width; }
      if (w > max) el.style.fontSize = Math.max(10, Math.floor(fs * max / w)) + "px";
    })();
    var ended = false;
    function end() {
      if (ended) return; ended = true; clearTimeout(t);
      document.removeEventListener("keydown", onKey, true); o.removeEventListener("click", end);
      if (onStartFade) onStartFade();
      removeOverlay(o);
    }
    function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); end(); } }
    var t = setTimeout(end, SHOW_MS);
    document.addEventListener("keydown", onKey, true); o.addEventListener("click", end);
  }

  function whoami() {
    var old = document.querySelector(".ws-whoami"); if (old) old.remove();
    var name = getName(), b = document.createElement("button");
    b.type = "button"; b.className = "ws-whoami";
    var label = name ? "Not " + name + "? Change name" : "Add your name";
    b.setAttribute("aria-label", label);
    b.innerHTML = '<span class="ws-dot"></span><span class="ws-lbl"></span>';
    b.querySelector(".ws-lbl").textContent = label;
    b.addEventListener("click", function () {
      // On touch screens (no hover) the first tap opens the dot, the second one changes the name.
      if (window.matchMedia && window.matchMedia("(hover: none)").matches && !b.classList.contains("open")) {
        b.classList.add("open"); setTimeout(function () { b.classList.remove("open"); }, 4000); return;
      }
      b.classList.remove("open"); change();
    });
    document.body.appendChild(b);
  }

  // Called by the intro right after Saturn: ask (first time) or greet (every time), then reveal the page.
  function run(ready) {
    addStyles();
    var name = getName(), o = makeOverlay();
    function finishWith(n, back) {
      splash(o, n, back, function () { ready(); whoami(); });
    }
    if (name) { finishWith(name, true); return; }
    if (read(SKIPPED) === "1") { removeOverlay(o); ready(); whoami(); return; }
    askName(o, "", function (v) {
      if (!v) { write(SKIPPED, "1"); removeOverlay(o); ready(); whoami(); return; }
      write(KEY, v); write(SKIPPED, ""); finishWith(v, false);
    });
  }

  // From the small link at the bottom: change (or add) the name later.
  function change() {
    if (document.querySelector(".ws-overlay")) return;
    addStyles();
    var o = makeOverlay();
    askName(o, getName(), function (v) {
      if (!v) { removeOverlay(o); return; }
      write(KEY, v); write(SKIPPED, "");
      splash(o, v, false, function () { whoami(); });
    });
  }

  window.IPTWelcome = { run: run, getName: getName, change: change };
})();
