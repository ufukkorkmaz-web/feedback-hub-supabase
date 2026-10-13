/* IPT Feedback · Created by Ufuk Korkmaz, 2026. */
/* ============================================================================
   "Need a boost?"  A small mirror with a motivational message that follows the
   teacher's face. Everything happens inside the browser: the camera picture is
   never recorded, uploaded or stored. Closing the box switches the camera off.
   Face tracking uses Google MediaPipe, loaded only when this box is opened.
   If it cannot load (blocked network, old browser) the message simply stays
   in place; nothing else changes.
   ============================================================================ */
(function () {
  "use strict";
  var CFG = (window.IPT_CONFIG && window.IPT_CONFIG.boost) || {};
  var FIRST = "You make it happen!";
  var DEFAULTS = [
    FIRST,
    "Your students are lucky to have you",
    "Small steps, big impact",
    "You are doing great work",
    "Thank you for showing up",
    "Look at that smile. Keep going!",
    "Teachers change the world, one lesson at a time"
  ];
  var MESSAGES = (Array.isArray(CFG.messages) && CFG.messages.length ? CFG.messages : DEFAULTS).map(String);
  // A message can be plain writing, or the file name of a hand-lettered picture (ending in .png, .webp, .jpg, .jpeg, .gif or .svg).
  var IS_PIC = /\.(png|webp|jpe?g|gif|svg)$/i;
  if (CFG.firstImage && !IS_PIC.test(MESSAGES[0])) MESSAGES[0] = String(CFG.firstImage);      // older setting: a picture for the first message
  var VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
  var MODEL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
  var FONT = '"Pacifico", "Brush Script MT", cursive';
  var ROTATE_MS = 5200;

  function supported() { return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  var reduceMotion = function () { return window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches; };

  function addStyles() {
    if (document.getElementById("boost-css")) return;
    var s = document.createElement("style"); s.id = "boost-css";
    s.textContent =
      ".boost-overlay{position:fixed;inset:0;z-index:9800;display:grid;place-items:center;padding:1rem;background:rgba(2,12,39,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease;overflow:auto}" +
      ".boost-overlay.show{opacity:1}" +
      ".boost-card{width:min(100%,40rem);border-radius:26px;padding:14px 14px 16px;color:#eef5ff;background:linear-gradient(150deg,rgba(38,92,170,.55),rgba(10,28,72,.92));border:1px solid rgba(255,255,255,.22);box-shadow:0 26px 70px rgba(1,10,37,.6),0 0 40px rgba(82,217,202,.18)}" +
      ".boost-stage{position:relative;width:100%;aspect-ratio:4/3;max-height:68vh;border-radius:18px;overflow:hidden;background:#07163a}" +
      "@media (orientation:portrait) and (max-width:600px){.boost-stage{aspect-ratio:3/4}}" +
      ".boost-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scaleX(-1)}" +
      ".boost-msg{position:absolute;left:50%;top:70%;transform:translateX(-50%);width:max-content;max-width:84%;text-align:center;font-family:" + FONT + ";line-height:1.2;color:#fff;" +
        "-webkit-text-stroke:7px rgba(10,28,72,.9);paint-order:stroke fill;text-shadow:0 3px 14px rgba(0,0,0,.55);pointer-events:none;transition:opacity .3s ease;will-change:left,top}" +
      ".boost-msg.off{opacity:0}" + ".boost-msg[data-pic]{-webkit-text-stroke:0;text-shadow:none;filter:drop-shadow(0 3px 10px rgba(0,0,0,.4))}" +
      ".boost-note{position:absolute;inset:0;display:grid;place-items:center;padding:1.5rem;text-align:center;font-size:16px;line-height:1.5;background:rgba(7,22,58,.92)}" +
      ".boost-flash{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none}" +
      ".boost-flash.go{animation:boostFlash .35s ease}" +
      "@keyframes boostFlash{from{opacity:.85}to{opacity:0}}" +
      ".boost-bar{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:14px}" +
      ".boost-btn{font:inherit;font-weight:700;padding:.6rem 1.15rem;border-radius:14px;border:1px solid rgba(255,255,255,.28);background:rgba(255,255,255,.12);color:#eef5ff;cursor:pointer}" +
      ".boost-btn.main{background:linear-gradient(135deg,#52d9ca,#658ff1);color:#06214e;border:0}" +
      ".boost-btn:disabled{opacity:.5;cursor:default}" +
      ".boost-btn:focus-visible{outline:3px solid #52d9ca;outline-offset:2px}" +
      ".boost-priv{margin:10px 6px 0;text-align:center;font-size:13px;color:#b7c7e6}" +
      "@media (prefers-reduced-motion:reduce){.boost-overlay,.boost-msg{transition:none}.boost-flash.go{animation:none}}";
    document.head.appendChild(s);
  }

  var detectorPromise = null;
  function loadDetector() {
    if (detectorPromise) return detectorPromise;
    detectorPromise = (async function () {
      var vision = await import(VISION + "/vision_bundle.mjs");
      var files = await vision.FilesetResolver.forVisionTasks(VISION + "/wasm");
      var make = function (delegate) {
        return vision.FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate: delegate }, runningMode: "VIDEO", minDetectionConfidence: 0.5 });
      };
      try { return await make("GPU"); } catch (e) { return await make("CPU"); }
    })();
    detectorPromise.catch(function () { detectorPromise = null; });
    return detectorPromise;
  }

  function open(returnTo) {
    if (document.querySelector(".boost-overlay")) return;
    addStyles();
    try { if (document.fonts && document.fonts.load) document.fonts.load('40px "Pacifico"'); } catch (e) {}

    var overlay = document.createElement("div");
    overlay.className = "boost-overlay";
    overlay.innerHTML =
      '<div class="boost-card" role="dialog" aria-modal="true" aria-label="Your motivational mirror">' +
        '<div class="boost-stage"><video class="boost-video" autoplay playsinline muted></video>' +
          '<div class="boost-msg off" aria-hidden="true"></div><div class="boost-flash"></div>' +
          '<div class="boost-note" role="status">Starting your camera…</div></div>' +
        '<div class="boost-bar"><button type="button" class="boost-btn main" data-a="photo" disabled>Take a photo</button>' +
          '<button type="button" class="boost-btn" data-a="next">New message</button>' +
          '<button type="button" class="boost-btn" data-a="close">Close</button></div>' +
        '<p class="boost-priv">Your camera stays on your device. Nothing is recorded or uploaded.</p>' +
      "</div>";
    var stage = overlay.querySelector(".boost-stage"), video = overlay.querySelector("video"),
        msg = overlay.querySelector(".boost-msg"), note = overlay.querySelector(".boost-note"), flash = overlay.querySelector(".boost-flash"),
        photoBtn = overlay.querySelector('[data-a="photo"]');

    var pics = {}, curPic = null;                                            // hand-lettered pictures: file name -> loaded image (or false if it could not load)
    MESSAGES.forEach(function (m) {
      if (!IS_PIC.test(m) || m in pics) return;
      var im = new Image(); pics[m] = null;
      im.onload = function () { pics[m] = im; if (!closed && MESSAGES[idx % MESSAGES.length] === m && !curPic && msg.textContent === "" && !msg.querySelector("img")) showMsg(idx, true); };
      im.onerror = function () { pics[m] = false; };
      im.src = m;
    });
    var stream = null, detector = null, raf = 0, rotTimer = 0, closed = false, idx = 0;
    var pos = { x: 0.5, y: 0.72, ready: false }, target = { x: 0.5, y: 0.72 }, lastFace = 0, lastVT = -1, lastTs = 0;

    function picWidth() { return Math.round(Math.min(520, stage.clientWidth * 0.8)); }
    function sizeText() {
      var w = stage.clientWidth; msg.style.fontSize = Math.max(22, Math.min(50, w * 0.075)) + "px";
      if (msg.querySelector("img")) msg.style.width = picWidth() + "px";
    }
    function showMsg(i, instant) {
      var apply = function () {
        var m = MESSAGES[i % MESSAGES.length];
        if (IS_PIC.test(m)) {
          if (pics[m] === false) { nextMsg(); return; }                       // this picture could not be loaded: move on
          if (!pics[m]) return;                                              // still loading: it appears as soon as it is ready
          curPic = pics[m]; msg.textContent = ""; var im = document.createElement("img"); im.src = curPic.src; im.alt = ""; im.style.cssText = "display:block;width:100%;height:auto";
          msg.style.width = picWidth() + "px"; msg.appendChild(im); msg.setAttribute("data-pic", "1");
        } else { curPic = null; msg.style.width = ""; msg.removeAttribute("data-pic"); msg.textContent = m; }
        msg.classList.remove("off");
      };
      if (instant || reduceMotion()) { apply(); return; }
      msg.classList.add("off"); setTimeout(function () { if (!closed) apply(); }, 300);
    }
    function nextMsg() { idx = (idx + 1) % MESSAGES.length; showMsg(idx); clearInterval(rotTimer); rotTimer = setInterval(nextMsg, ROTATE_MS); }

    // where the face is, as fractions (0..1) of the stage, taking the mirror and the "cover" crop into account
    function faceToStage(b) {
      var W = stage.clientWidth, H = stage.clientHeight, vw = video.videoWidth, vh = video.videoHeight;
      var sc = Math.max(W / vw, H / vh), ox = (W - vw * sc) / 2, oy = (H - vh * sc) / 2;
      var x1 = W - (ox + (b.originX + b.width) * sc), x2 = W - (ox + b.originX * sc);
      return { cx: (x1 + x2) / 2 / W, top: (oy + b.originY * sc) / H, bottom: (oy + (b.originY + b.height) * sc) / H };
    }
    function place() {
      var W = stage.clientWidth, H = stage.clientHeight, mw = msg.offsetWidth, mh = msg.offsetHeight;
      var half = mw / 2 / W, margin = 8 / W;
      var cx = Math.min(1 - half - margin, Math.max(half + margin, pos.x));
      var top = Math.min(H - mh - 8, Math.max(8, pos.y * H));
      msg.style.left = (cx * 100) + "%"; msg.style.top = top + "px";
      return { cx: cx, top: top };
    }
    function loop(ts) {
      if (closed) return;
      raf = requestAnimationFrame(loop);
      if (!video.videoWidth) return;
      if (detector && video.currentTime !== lastVT && ts - lastTs > 45) {      // about 20 looks per second is plenty
        lastVT = video.currentTime; lastTs = ts;
        try {
          var res = detector.detectForVideo(video, performance.now()), d = res && res.detections && res.detections[0];
          if (d && d.boundingBox) {
            var f = faceToStage(d.boundingBox), H = stage.clientHeight, mh = msg.offsetHeight;
            lastFace = ts; target.x = f.cx;
            var above = f.top * H - mh - 0.06 * H;                                  // above the head if there is room, otherwise just below the chin
            target.y = (above >= 8 ? above : f.bottom * H + 0.04 * H) / H;
          }
        } catch (e) { detector = null; }
      }
      if (ts - lastFace > 1500) { target.x = 0.5; target.y = 0.72; }               // nobody in view: settle back to the middle
      var k = pos.ready ? 0.16 : 1; pos.ready = true;
      pos.x += (target.x - pos.x) * k; pos.y += (target.y - pos.y) * k;
      place();
    }

    function photo() {
      var W = stage.clientWidth, H = stage.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1), vw = video.videoWidth, vh = video.videoHeight;
      if (!vw) return;
      var c = document.createElement("canvas"); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
      var x = c.getContext("2d"); x.scale(dpr, dpr);
      var sc = Math.max(W / vw, H / vh), dw = vw * sc, dh = vh * sc;
      x.save(); x.translate(W, 0); x.scale(-1, 1); x.drawImage(video, (W - dw) / 2, (H - dh) / 2, dw, dh); x.restore();      // mirrored, like the screen
      if (msg.getAttribute("data-pic") && curPic) {                              // the picture already has its own white edge
        var iw = msg.offsetWidth, ih = msg.offsetHeight, pp = place();
        x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 12; x.shadowOffsetY = 3;
        x.drawImage(curPic, pp.cx * W - iw / 2, pp.top, iw, ih);
        return finish(c);
      }
      var fs = parseFloat(msg.style.fontSize) || 36, text = msg.textContent, maxW = W * 0.84, words = text.split(/\s+/), lines = [], cur = "";
      x.font = fs + "px " + FONT;
      words.forEach(function (w) { var t = cur ? cur + " " + w : w; if (x.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
      if (cur) lines.push(cur);
      var lh = fs * 1.2, p = place(), y0 = p.top + fs * 0.92;
      x.textAlign = "center"; x.lineJoin = "round"; x.lineWidth = Math.max(5, fs * 0.16);
      x.strokeStyle = "rgba(10,28,72,.9)"; x.fillStyle = "#fff"; x.shadowColor = "rgba(0,0,0,.5)"; x.shadowBlur = 12; x.shadowOffsetY = 3;
      lines.forEach(function (ln, i) { var px = p.cx * W, py = y0 + i * lh; x.strokeText(ln, px, py); x.fillText(ln, px, py); });
      finish(c);
    }
    function finish(c) {
      flash.classList.remove("go"); void flash.offsetWidth; flash.classList.add("go");
      c.toBlob(function (blob) {
        if (!blob) return;
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ipt-you-make-it-happen.png";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
      }, "image/png");
    }

    function close() {
      if (closed) return; closed = true;
      cancelAnimationFrame(raf); clearInterval(rotTimer);
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      try { video.srcObject = null; } catch (e) {}
      try { detector && detector.close && detector.close(); } catch (e) {}
      document.removeEventListener("keydown", onKey, true); window.removeEventListener("resize", sizeText);
      overlay.classList.remove("show"); setTimeout(function () { overlay.remove(); }, 260);
      if (returnTo && returnTo.focus) { try { returnTo.focus({ preventScroll: true }); } catch (e) {} }
    }
    function onKey(e) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === "Tab") {
        var f = Array.prototype.filter.call(overlay.querySelectorAll("button"), function (b) { return !b.disabled; }); if (!f.length) return;
        var i = f.indexOf(document.activeElement);
        if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
    }
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { close(); return; }
      var b = e.target.closest && e.target.closest("button"); if (!b) return;
      var a = b.getAttribute("data-a"); if (a === "close") close(); else if (a === "next") nextMsg(); else if (a === "photo") photo();
    });
    document.addEventListener("keydown", onKey, true); window.addEventListener("resize", sizeText);
    document.body.appendChild(overlay); sizeText();
    requestAnimationFrame(function () { requestAnimationFrame(function () { overlay.classList.add("show"); overlay.querySelector('[data-a="close"]').focus({ preventScroll: true }); }); });

    function fail(text) { note.textContent = text; note.hidden = false; note.style.display = "grid"; }
    (async function () {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      } catch (e) {
        var denied = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
        fail(denied ? "The camera is blocked. You can allow it from the lock icon in the address bar, or just skip this: nothing else is affected."
                    : "No camera was found on this device.");
        return;
      }
      if (closed) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      video.srcObject = stream;
      try { await video.play(); } catch (e) {}
      note.style.display = "none"; photoBtn.disabled = false;
      sizeText(); idx = 0; showMsg(0, true); rotTimer = setInterval(nextMsg, ROTATE_MS);
      raf = requestAnimationFrame(loop);
      try { detector = await loadDetector(); } catch (e) { detector = null; }       // the message already works while this loads
    })();
  }

  window.IPTBoost = { open: open, supported: supported };
})();
