/* ============ SETTINGS ============ */
// Where submissions are sent (see README). Google Apps Script web-app URL or Formspree URL.
// (Both values below come from config.js. The text after || is only a safety net if that file is missing.)
const CFG = window.IPT_CONFIG || {};
const FORM_ENDPOINT = CFG.formEndpoint || "https://formspree.io/f/xbglqzql";

// Only school emails from this domain can open the questions
const ALLOWED_EMAIL_DOMAIN = CFG.emailDomain || "bilfen.k12.tr";
const EMAIL_WARNING = "Please enter with your Bilfen credentials. Your school email must end with @" + ALLOWED_EMAIL_DOMAIN + ".";
const EMAIL_RE = new RegExp("^[^\\s@]+@" + ALLOWED_EMAIL_DOMAIN.replace(/\./g, "\\.") + "$", "i");

const YEARS = {
  year6: {
    label: "Year 6", logo: "assets/logo-year6.png", logoAlt: "Year 7 IPT school badge logo", kicker: "YEAR 6 IPT",
    title: "Teaching feedback, brightly collected.",
    intro: "Dear colleagues, please complete this form after teaching Year 6 IPT. Your reflections, ideas, and suggestions help us improve together.",
    emailHelp: "Your designated school email will be included with this Year 6 response. Please enter your email to proceed.",
    workedHelp: "Celebrate the strongest topic, strategy, or classroom moment from Year 6.",
    workedQ: "What was the best topic for you and your Year 6 classes? *",
    planHelp: "Your ideas can make future Year 6 weeks clearer, smoother, and more impactful.",
    planQ: "What would you change in this Year 6 plan? How would you change it? *",
    pulseHelp: "Choose the score that best represents your Year 6 teaching experience.",
    slider: "Move the bright slider from very unclear to very clear.",
    note: "* Indicates a required response. Thank you for sharing your expertise.",
    backBtn: "background:#fff;color:#075782;", submitBtn: "background:linear-gradient(135deg,#fff15d,#35c9f4);color:#073d67;",
    submitTxt: "#073d67", boxCls: "border-white/30 bg-white/15", outCls: "bg-white/60", accent: "accent-sky-600"
  },
  year7: {
    label: "Year 7", logo: "assets/logo-year7.png", logoAlt: "Year 7 IPT school badge logo", kicker: "YEAR 7 IPT",
    title: "Teaching feedback, thoughtfully collected.",
    intro: "Dear colleagues, please complete this form after teaching. Your reflections, ideas, and suggestions help us improve together.",
    emailHelp: "Your designated school email will be included with this response. Please enter your email to proceed with the feedback form.",
    workedHelp: "Celebrate the strongest topic, strategy, or classroom moment from this year.",
    workedQ: "What was the best topic for you and your classes? *",
    planHelp: "Your ideas can make future weeks clearer, smoother, and more impactful.",
    planQ: "What would you change in this year's plan? How would you change it? *",
    pulseHelp: "Choose the score that best represents your Week 01 teaching experience.",
    slider: "Move the glass slider from very unclear to very clear.",
    note: "* Indicates a required response. Thank you for taking the time to share your expertise.",
    backBtn: "background:#173f78;color:#f4f9ff;", submitBtn: "background:linear-gradient(135deg,#52d9ca,#658ff1);color:#06214e;",
    submitTxt: "#06214e", boxCls: "border-white/15 bg-slate-950/20", outCls: "bg-teal-200/15", accent: "accent-teal-300"
  }
};

const SCORES = {
  overall: ["Needs significant improvement", "Needs improvement", "Satisfactory", "Very good", "Excellent"],
  resources: ["Not effective", "Slightly effective", "Moderately effective", "Effective", "Highly effective"],
  engagement: ["Very low engagement", "Low engagement", "Moderate engagement", "High engagement", "Very high engagement"]
};

/* ============ SEND LATER (OUTBOX) ============ */
// If a submission cannot be sent (no signal, server busy), it waits on this device and is sent automatically later.
const OUTBOX_KEY = "ipt-outbox", OUTBOX_DAYS = 14;
const outboxRead = () => { try { return JSON.parse(localStorage.getItem(OUTBOX_KEY) || "[]").filter(i => Date.now() - i.t < OUTBOX_DAYS * 864e5); } catch (err) { return []; } };
const outboxWrite = list => { try { list.length ? localStorage.setItem(OUTBOX_KEY, JSON.stringify(list)) : localStorage.removeItem(OUTBOX_KEY); } catch (err) {} };
let outboxFlushing = false, outboxNote = null, outboxTimer = 0;

function outboxShow(msg, retry, ms) {
  if (!outboxNote) {
    outboxNote = document.createElement("div");
    outboxNote.className = "outbox-note"; outboxNote.setAttribute("role", "status"); outboxNote.setAttribute("aria-live", "polite");
    outboxNote.addEventListener("click", e => { if (e.target.closest(".outbox-retry")) outboxFlush(true); });
    document.body.appendChild(outboxNote);
  }
  clearTimeout(outboxTimer);
  if (!msg) { outboxNote.hidden = true; return; }
  outboxNote.hidden = false;
  outboxNote.innerHTML = '<span class="outbox-dot" aria-hidden="true"></span><span class="outbox-text"></span>' + (retry ? '<button type="button" class="outbox-retry">Send now</button>' : "");
  outboxNote.querySelector(".outbox-text").textContent = msg;
  if (ms) outboxTimer = setTimeout(outboxRefresh, ms);
}
function outboxRefresh() {
  const n = outboxRead().length;
  outboxShow(n ? (n === 1 ? "1 reflection is waiting to be sent." : n + " reflections are waiting to be sent.") : "", n > 0);
}
function outboxAdd(payload, year) {
  const list = outboxRead(); list.push({ t: Date.now(), y: year, payload });
  outboxWrite(list); outboxRefresh();
}
// Sends everything waiting. Stops at the first connection problem and tries again later.
async function outboxFlush(manual) {
  if (outboxFlushing || window.__pv) return;
  let list = outboxRead(); if (!list.length) { outboxRefresh(); return; }
  if (navigator.onLine === false && !manual) return;
  outboxFlushing = true; let sent = 0, dropped = 0;
  try {
    while (list.length) {
      let res;
      try { res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(list[0].payload) }); }
      catch (err) { break; }                                              // still offline
      if (res.status >= 500 || res.status === 429) break;                 // server busy: try again later
      if (res.ok) sent++; else dropped++;                                 // a refused reflection would never succeed, so it is not kept
      list.shift(); outboxWrite(list);
    }
  } finally { outboxFlushing = false; }
  if (sent) outboxShow(sent === 1 ? "Your waiting reflection was sent. Thank you!" : sent + " waiting reflections were sent. Thank you!", false, 5000);
  else if (dropped) outboxShow("A waiting reflection could not be sent. Please submit it again.", false, 6000);
  else if (manual) outboxShow("Still no connection. We will keep trying.", true, 4000);
  else outboxRefresh();
}
function setupOutbox() {
  outboxRefresh();
  outboxFlush();
  window.addEventListener("online", () => outboxFlush());
  document.addEventListener("visibilitychange", () => { if (!document.hidden) outboxFlush(); });
  setInterval(() => outboxFlush(), 30000);
}

/* ============ RENDERING ============ */
const card = (y, id, icon, title, help, q) => `
  <section class="question-section reflection-card glass-panel rounded-[24px] p-5 sm:p-7">
    <div class="mb-5 flex gap-4"><div class="icon-bubble"><i data-lucide="${icon}"></i></div>
      <div><h2 class="t-title" style="font-size:24px;">${title}</h2><p class="t-help mt-1">${help}</p></div></div>
    <label for="${y}-${id}" class="t-label mb-2 block text-sm">${q}</label>
    <div class="dictate-box">
      <textarea id="${y}-${id}" class="field" required></textarea>
      <span class="dictate-wrap"><button type="button" class="dictate-btn" data-dictate-for="${y}-${id}" aria-label="Start dictation" aria-pressed="false"><i data-lucide="mic" aria-hidden="true"></i><span>Speak</span></button><span class="dictate-glow" aria-hidden="true"></span></span>
    </div>
    <span class="dictation-feedback t-help" role="status" aria-live="polite"></span>
  </section>`;

const select = (y, id, label) => `
  <div><label for="${y}-${id}" class="t-label mb-2 block text-sm">${label} *</label>
    <select id="${y}-${id}" class="field" required><option value="" selected disabled>Select a score</option>
    ${SCORES[id].map((t, i) => `<option value="${i + 1}">${i + 1} — ${t}</option>`).join("")}</select></div>`;

function renderYear(y, c) {
  document.getElementById(y + "-view").innerHTML = `
  <div class="w-full px-4 pt-7 sm:px-7 sm:pt-10">
    <header class="year-header glass-panel mx-auto max-w-5xl rounded-[28px] px-6 py-7 sm:px-10 sm:py-9">
      <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <button id="back-${y}" type="button" class="mb-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 font-bold" style="${c.backBtn}"><i data-lucide="arrow-left" aria-hidden="true"></i><span>Back to menu</span></button>
          <p class="t-kicker mb-2 uppercase">${c.kicker}</p>
          <h1 class="t-title" style="font-size:32px;">${c.title}</h1>
          <p class="t-intro mt-3 max-w-2xl">${c.intro}</p>
        </div>
        <img class="h-28 w-28 self-start object-contain sm:self-auto" src="${c.logo}" alt="${c.logoAlt}">
      </div>
    </header>
  </div>
  <div class="w-full px-4 pb-10 pt-5 sm:px-7 sm:pb-14">
    <form id="${y}-form" class="form-shell mx-auto max-w-5xl space-y-5" novalidate>
      <div class="hp-field" aria-hidden="true"><label for="${y}-gotcha">Leave this field empty</label><input type="text" id="${y}-gotcha" name="_gotcha" tabindex="-1" autocomplete="off"></div>
      <section class="glass-panel rounded-[24px] p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div class="min-w-0 flex-1"><label for="${y}-email" class="t-label mb-2 block">Email</label>
            <input id="${y}-email" class="field" type="email" required autocomplete="email" placeholder="Enter your school email address"></div>
          <div class="min-w-0 flex-1"><label for="${y}-week" class="t-label mb-2 block">Week</label>
            <input id="${y}-week" class="field" type="text" required autocomplete="off" placeholder="Enter week"></div>
          <p class="t-help max-w-xs text-sm leading-relaxed">${c.emailHelp}</p>
        </div>
        <p id="${y}-email-warn" class="email-warn" role="alert" hidden></p>
      </section>
      <section id="${y}-hf" class="question-section hf-panel glass-panel rounded-[24px] p-5 sm:p-6">
        <h2 class="t-title" style="font-size:20px;">Prefer to talk? Two ways to use your voice</h2>
        <div class="hf-options mt-3">
          <div class="hf-option">
            <p class="hf-option-title"><i data-lucide="audio-lines" aria-hidden="true"></i> Hands-free</p>
            <p class="t-help">Answer the whole form by voice. Say <b>“next question”</b> to move on, <b>“previous question”</b> to go back, give scores like <b>“overall four”</b>, and <b>“submit feedback”</b> to send.</p>
            <button type="button" id="${y}-hf-toggle" class="hf-btn mt-3 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 font-bold shadow-lg" style="${c.submitBtn}"><i data-lucide="audio-lines" aria-hidden="true"></i><span style="color:${c.submitTxt};">Start hands-free</span></button>
          </div>
          <div class="hf-option">
            <p class="hf-option-title"><i data-lucide="mic" aria-hidden="true"></i> Speak buttons</p>
            <p class="t-help">Prefer to stay in control? Press the <b>Speak</b> button in the corner of any answer box to dictate just that one, and press <b>Stop</b> when you are done. You can mix typing and speaking freely.</p>
          </div>
        </div>
        <p id="${y}-hf-status" class="hf-status t-help" role="status" aria-live="polite" hidden></p>
      </section>
      ${card(y, "worked", "thumbs-up", "What worked well?", c.workedHelp, c.workedQ)}
      ${card(y, "challenge", "frown", "What didn't work?", "Share the challenge, why it happened, and how you responded or improved it.", "What didn't work? Why? How did you handle the problem? *")}
      ${card(y, "plan", "lightbulb", "Shape the next plan", c.planHelp, c.planQ)}
      <section id="${y}-pulse" class="question-section glass-panel rounded-[24px] p-5 sm:p-7">
        <div class="mb-6 flex gap-4"><div class="icon-bubble"><i data-lucide="bar-chart-3"></i></div>
          <div><h2 class="t-title" style="font-size:24px;">Quick pulse check</h2><p class="t-help mt-1">${c.pulseHelp}</p></div></div>
        <div class="grid gap-5 md:grid-cols-2">
          ${select(y, "overall", "Overall rating of the week")}
          ${select(y, "resources", "Effectiveness of teaching resources")}
          ${select(y, "engagement", "Student engagement with content and activities")}
          <div class="rounded-2xl border ${c.boxCls} p-4">
            <div class="flex items-start justify-between gap-4">
              <div><label for="${y}-clarity" class="t-label block text-sm">Learning objectives: clarity and ease of understanding</label>
                <p class="t-help mt-1" style="font-size:13px;">${c.slider}</p></div>
              <output id="${y}-output" class="rounded-xl ${c.outCls} px-3 py-1 text-sm font-bold">3 / 5</output>
            </div>
            <input id="${y}-clarity" class="mt-4 w-full ${c.accent}" type="range" min="1" max="5" value="3">
            <div class="flex justify-between text-xs"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
          </div>
        </div>
      </section>
      ${card(y, "notes", "sparkles", "One more thought", "Recommendations, ideas, and observations are always welcome.", "Any other notes or recommendations? *")}
      <section id="${y}-final" class="question-section glass-panel rounded-[24px] p-5 sm:p-6">
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p class="t-note">${c.note}</p>
          <button class="inline-flex items-center gap-2 rounded-2xl px-6 py-3 font-bold shadow-lg" type="submit" style="${c.submitBtn}"><i data-lucide="send"></i><span style="color:${c.submitTxt};">Submit feedback</span></button>
        </div>
        <p id="${y}-draft" class="draft-note" aria-live="polite" hidden><span class="draft-text"></span> <button type="button" class="draft-clear">Clear draft</button></p>
        <p id="${y}-status" class="mt-4 min-h-6 text-sm font-medium" aria-live="polite"></p>
      </section>
    </form>
  </div>`;
}

/* ============ BEHAVIOUR ============ */
function showView(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(id).classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setupForm(y) {
  const form = document.getElementById(y + "-form"), email = document.getElementById(y + "-email");
  const sections = form.querySelectorAll(".question-section"), slider = document.getElementById(y + "-clarity");
  const output = document.getElementById(y + "-output"), status = document.getElementById(y + "-status");
  const button = form.querySelector('button[type="submit"]'), val = id => document.getElementById(`${y}-${id}`).value.trim();
  const say = (msg, ok) => { status.textContent = msg; status.className = "mt-4 min-h-6 text-sm font-medium " + (ok ? "status-success" : "status-error"); };
  const emailOk = () => email.checkValidity() && EMAIL_RE.test(email.value.trim());     // must be a valid @bilfen.k12.tr address
  const gate = () => sections.forEach(s => s.classList.toggle("revealed", emailOk()));
  const warn = document.getElementById(y + "-email-warn");
  let warnTimer = 0;
  const showWarn = () => {
    const bad = email.value.trim() !== "" && !emailOk();
    warn.hidden = !bad; warn.textContent = bad ? EMAIL_WARNING : ""; email.classList.toggle("is-warn", bad);
  };
  const clarity = () => { output.textContent = slider.value + " / 5"; slider.setAttribute("aria-valuenow", slider.value); };
  email.addEventListener("input", () => {
    gate(); clearTimeout(warnTimer);
    if (emailOk() || email.value.trim() === "") showWarn(); else warnTimer = setTimeout(showWarn, 900);   // wait until they stop typing
  });
  email.addEventListener("change", () => { gate(); clearTimeout(warnTimer); showWarn(); });
  slider.addEventListener("input", clarity); clarity();

  /* ----- Draft saving: keeps what was typed on this device, so a refresh or lost signal doesn't lose it ----- */
  const DRAFT_KEY = "ipt-draft-" + y, DRAFT_DAYS = 14;
  const draftFields = ["email", "week", "worked", "challenge", "plan", "overall", "resources", "engagement", "clarity", "notes"]
    .map(id => document.getElementById(`${y}-${id}`));
  const draftBox = document.getElementById(y + "-draft"), draftText = draftBox.querySelector(".draft-text");
  let draftTimer = 0, draftOff = false;
  const draftShow = msg => { draftText.textContent = msg; draftBox.hidden = !msg; };
  const draftHas = d => draftFields.some(f => f.id !== `${y}-clarity` && d[f.id] && String(d[f.id]).trim() !== "");
  function draftSave() {
    if (draftOff) return;
    const d = { t: Date.now() };
    draftFields.forEach(f => { d[f.id] = f.value; });
    try {
      if (draftHas(d)) { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); draftShow("Draft saved on this device"); }
      else { localStorage.removeItem(DRAFT_KEY); draftShow(""); }
    } catch (err) {}
  }
  function draftClear() { try { localStorage.removeItem(DRAFT_KEY); } catch (err) {} draftShow(""); }
  function draftRestore() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      if (!d || Date.now() - d.t > DRAFT_DAYS * 864e5) { if (d) draftClear(); return; }
      draftFields.forEach(f => { if (d[f.id] !== undefined && d[f.id] !== "") f.value = d[f.id]; });
      clarity(); gate();
      if (draftHas(d)) draftShow("Your saved draft was restored");
    } catch (err) {}
  }
  const queueDraft = () => { clearTimeout(draftTimer); draftTimer = setTimeout(draftSave, 500); };
  form.addEventListener("input", queueDraft);
  form.addEventListener("change", queueDraft);
  window.addEventListener("pagehide", () => { clearTimeout(draftTimer); draftSave(); });
  draftBox.querySelector(".draft-clear").addEventListener("click", () => {
    draftOff = true; clearTimeout(draftTimer);
    form.reset(); slider.value = "3"; clarity(); gate(); showWarn(); draftClear();
    draftOff = false;
  });
  draftRestore();

  form.addEventListener("submit", async e => {
    e.preventDefault(); status.textContent = "";
    if (!emailOk()) { showWarn(); email.focus(); return; }
    if (!form.checkValidity()) { form.reportValidity(); return say("Please complete every required field before submitting your feedback."); }
    if (window.__pv) return say("Preview mode: nothing was sent.", true);
    const trap = document.getElementById(y + "-gotcha");
    if (trap && trap.value) {                                   // a hidden field only bots fill in: pretend it worked, send nothing
      form.reset(); slider.value = "3"; clarity(); gate(); draftClear();
      return say("Thank you — your feedback has been saved successfully.", true);
    }
    button.disabled = true;
    const pretty = {
      _subject: `New ${YEARS[y].label} IPT feedback (Week ${val("week")})`, email: val("email"),
      "Year level": YEARS[y].label, "Week": val("week"),
      "What worked well?": val("worked"), "What didn't work?": val("challenge"), "Shape the next plan": val("plan"),
      "Overall rating of the week (1-5)": val("overall"), "Effectiveness of teaching resources (1-5)": val("resources"),
      "Student engagement (1-5)": val("engagement"), "Learning objectives clarity (1-5)": slider.value,
      "One more thought": val("notes"),
      _gotcha: ""                                                  // spam trap, stays empty for real people
    };
    const clearForm = () => {
      draftOff = true; clearTimeout(draftTimer);
      form.reset(); slider.value = "3"; clarity(); gate(); showWarn(); draftClear(); draftOff = false;
    };
    try {
      let res = null;
      try { res = await fetch(FORM_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", "Accept": "application/json" }, body: JSON.stringify(pretty) }); }
      catch (netErr) { res = null; }                              // no connection
      if (!res || res.status >= 500 || res.status === 429) {      // cannot send right now: keep it and send automatically later
        outboxAdd(pretty, y); clearForm();
        say("No connection right now. Your reflection is saved on this device and will be sent automatically as soon as you are back online.", true);
        return;
      }
      if (!res.ok) throw new Error("save");
      draftOff = true; clearTimeout(draftTimer);
      form.reset(); slider.value = "3"; clarity(); gate(); showWarn(); draftClear(); draftOff = false;
      say("Thank you — your feedback has been saved successfully.", true);
      try { celebrate(y); } catch (err) { console.error("Celebration failed:", err); }   // never affects the saved result
    } catch (err) { say("We could not confirm your submission. Please refresh before trying again."); }
    finally { button.disabled = false; }
  });
}

/* ============ DICTATION PUNCTUATION ============ */
// 1) Spoken punctuation: saying "comma", "full stop", "question mark", "new line" ... types the symbol.
//    ("period" is left alone on purpose, because teachers also say "first period" for lessons.)
// 2) Automatic clean-up: every finished phrase gets a full stop (or a question mark when it is phrased like
//    a question), every sentence starts with a capital letter, and spacing around punctuation is tidied.
const SPOKEN_PUNCTUATION = [
  ["full stop", ". "], ["question mark", "? "], ["exclamation mark", "! "], ["exclamation point", "! "],
  ["semicolon", "; "], ["semi colon", "; "], ["colon", ": "], ["comma", ", "],
  ["new paragraph", "\n\n"], ["newline", "\n"], ["new line", "\n"]
];
const AUX_VERBS = "do|does|did|can|could|would|should|will|shall|is|are|was|were|have|has|had|may|might";
// "why did ...", "how long does ...", "what was ..."  (but not "what worked well ...")
const WH_QUESTION = new RegExp("^(?:who|whom|whose|what|when|where|which|why|how)(?:\\s+(?:much|long|often|far|well|old|many\\s+\\w+))?\\s+(?:" + AUX_VERBS + ")\\b", "i");
// "can we ...", "did the students ...", "is there ..."
const AUX_QUESTION = /^(?:do|does|did|can|could|would|should|will|is|are|was|were)\s+(?:you|we|they|i|he|she|it|there|this|that|these|those|the|any|anyone|everyone|someone|my|our|your|their|a|an)\b/i;

function applySpokenPunctuation(text) {
  let out = text;
  SPOKEN_PUNCTUATION.forEach(([word, symbol]) => {
    out = out.replace(new RegExp("\\s*\\b" + word + "\\b\\s*", "gi"), symbol);
  });
  return out;
}

function looksLikeQuestion(text) {
  const parts = text.split(/[.!?\n]+\s*/).filter(part => part.trim());
  const last = (parts.length ? parts[parts.length - 1] : text).trim();
  return WH_QUESTION.test(last) || AUX_QUESTION.test(last);
}

// Joins two pieces of text: no space before punctuation or around line breaks, and a symbol you say
// replaces the full stop that was added automatically (so "full stop" never makes "..").
function joinText(base, add) {
  if (!base) return add;
  if (!add) return base;
  if (/^[,.;:?!]/.test(add)) return base.replace(/[,.;:?!]$/, "") + add;
  if (/\n$/.test(base) || /^\n/.test(add)) return base + add;
  return base + " " + add;
}

function startsSentence(text) {
  return text === "" || /[.!?]["')\]]?\s*$/.test(text) || /\n\s*$/.test(text);
}

function capitalise(text, atStart) {
  return text.replace(/(^|[.!?]["')\]]?\s+|\n\s*)([a-z])/g, (match, before, letter) =>
    before === "" && !atStart ? match : before + letter.toUpperCase());
}

// segments: [{ text, final }]  (a "segment" is one phrase between pauses). Unfinished phrases get no full stop yet.
function formatDictation(segments, startsNewSentence) {
  let out = "";
  segments.forEach(seg => {
    let t = applySpokenPunctuation(seg.text).replace(/^[ \t]+|[ \t]+$/g, "");
    if (!t) return;
    if (seg.final && !/[.!?,;:]["')\]]?$/.test(t) && !/\n$/.test(t)) t += looksLikeQuestion(t) ? "?" : ".";
    out = joinText(out, t);
  });
  return capitalise(out, startsNewSentence);
}

function setupDictation() {
  const buttons = document.querySelectorAll("[data-dictate-for]");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    buttons.forEach(b => { b.disabled = true; b.querySelector("span").textContent = "Unavailable"; });
    document.querySelectorAll(".hf-panel").forEach(p => p.remove());      // hands-free needs voice input
    return;
  }
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  let activeButton = null, activeTextarea = null, activeFeedback = null, recognition = null, wantListening = false, session = 0;
  // Dictation switches itself off after a long silence (so the mic is never left open by accident)
  const SILENCE_AFTER_SPEECH_MS = 6000;   // quiet for this long after the last words: stop
  const SILENCE_AT_START_MS = 10000;      // nothing said at all after pressing Speak: stop
  const HF_AFTER_SPEECH_MS = 20000;       // hands-free waits longer, people pause to think
  const HF_AT_START_MS = 30000;
  let silenceTimer = 0, recCounter = 0;
  const hf = { on: false, y: null, idx: 0, switching: false, cmdRec: null, token: 0, done: new Set() };
  const clearSilence = () => { clearTimeout(silenceTimer); silenceTimer = 0; };
  const armSilence = ms => {
    clearSilence();
    if (hf.on) ms = ms >= SILENCE_AT_START_MS ? HF_AT_START_MS : HF_AFTER_SPEECH_MS;
    silenceTimer = setTimeout(() => {
      if (hf.on) { hfEnd("Hands-free paused after a long pause. Press Start to continue."); return; }
      if (!activeButton) return;
      const fb = activeFeedback;
      stopDictation();
      if (fb) fb.textContent = "Dictation stopped after a pause. Press Speak to continue.";
    }, ms);
  };

  /* ----- Desktop: the glow around "Stop" follows how loud you speak (sets --voice from 0 to 1 on the button's wrapper) ----- */
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let meter = null;
  function stopMeter() {
    if (!meter) return;
    const m = meter; meter = null;
    m.dead = true; cancelAnimationFrame(m.raf);
    try { m.stream && m.stream.getTracks().forEach(t => t.stop()); } catch (err) {}
    try { m.ctx && m.ctx.close(); } catch (err) {}
    if (m.wrap) { m.wrap.classList.remove("is-voice"); m.wrap.style.removeProperty("--voice"); }
  }
  function startMeter(wrap) {
    stopMeter();
    if (isMobile || reduceMotion || !wrap || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
    const m = meter = { wrap, dead: false, raf: 0, stream: null, ctx: null };
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      if (m.dead) { stream.getTracks().forEach(t => t.stop()); return; }       // dictation ended before the mic opened
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) { stream.getTracks().forEach(t => t.stop()); return; }
      m.stream = stream; m.ctx = new AC();
      const analyser = m.ctx.createAnalyser(); analyser.fftSize = 512; analyser.smoothingTimeConstant = 0.6;
      m.ctx.createMediaStreamSource(stream).connect(analyser);
      const data = new Uint8Array(analyser.fftSize); let level = 0;
      wrap.classList.add("is-voice");
      const tick = () => {
        if (m.dead) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0; for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v; }
        const target = Math.min(1, Math.sqrt(sum / data.length) * 7);          // quiet room ~0, normal speech ~0.5-1
        level += (target - level) * (target > level ? 0.5 : 0.12);              // rises fast, falls slowly
        wrap.style.setProperty("--voice", level.toFixed(3));
        m.raf = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => { m.dead = true; });                                         // no mic access: the glow simply stays off
  }

  function resetButton() {
    clearSilence(); stopMeter();
    if (hf.on && !hf.switching) hfEnd("Hands-free stopped.");       // the person stopped dictation by hand
    if (!activeButton) return;
    if (activeFeedback && activeFeedback.textContent.startsWith("Listening")) activeFeedback.textContent = "";
    activeButton.classList.remove("is-listening");
    activeButton.setAttribute("aria-pressed", "false");
    activeButton.setAttribute("aria-label", activeButton.dataset.defaultLabel);
    activeButton.querySelector("span").textContent = "Speak";
    activeButton = activeTextarea = activeFeedback = recognition = null;
    wantListening = false;
  }
  function stopDictation() {
    const rec = recognition;
    resetButton();                                   // the button turns off right away
    if (rec) { try { rec.stop(); } catch (err) {} }  // the last spoken words can still arrive
  }

  buttons.forEach(button => {
    button.dataset.defaultLabel = button.getAttribute("aria-label");
    button.addEventListener("click", () => {
      if (activeButton === button) return stopDictation();
      if (activeButton) stopDictation();             // another Speak button was on: switch it off first

      const textarea = document.getElementById(button.dataset.dictateFor);
      const feedback = textarea.closest(".dictate-box").parentElement.querySelector(".dictation-feedback");
      const mySession = ++session;
      let committed = textarea.value.trim();
      const write = extra => {
        textarea.value = joinText(committed, extra);
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
      };

      activeButton = button; activeTextarea = textarea; activeFeedback = feedback; wantListening = true;
      button.classList.add("is-listening");
      button.setAttribute("aria-pressed", "true");
      button.setAttribute("aria-label", "Stop dictation");
      button.querySelector("span").textContent = "Stop";
      feedback.textContent = "Listening… speak naturally, then press Stop. Say \"comma\", \"full stop\" or \"question mark\" to add punctuation.";
      textarea.focus();
      armSilence(SILENCE_AT_START_MS);
      startMeter(button.closest(".dictate-wrap"));

      const begin = () => {
        const rec = new Recognition();
        const recId = ++recCounter;
        recognition = rec;
        rec.lang = "en-US";
        rec.continuous = !isMobile;
        rec.interimResults = !isMobile;
        rec.onresult = event => {
          if (mySession !== session && activeTextarea === textarea) return;   // a newer session owns this box
          if (activeTextarea === textarea) armSilence(SILENCE_AFTER_SPEECH_MS);   // words are still coming in
          const live = hf.on && activeTextarea === textarea;                       // hands-free: listen for spoken commands
          let command = null;
          if (isMobile) {
            let added = false;
            for (let i = event.resultIndex; i < event.results.length; i++) {
              if (!event.results[i].isFinal) continue;
              let text = event.results[i][0].transcript;
              if (live) { const x = pullCommand(text); text = x.text; command = command || x.cmd; }
              const piece = formatDictation([{ text, final: true }], startsSentence(committed));
              if (piece) { committed = joinText(committed, piece); added = true; }
            }
            if (added) write("");
          } else {
            const segs = Array.from(event.results).map((r, i) => {
              let text = r[0].transcript, cmd = null;
              if (live) { const x = pullCommand(text); text = x.text; cmd = x.cmd; }
              return { text, final: r.isFinal, cmd, key: recId + ":" + i };
            });
            write(formatDictation(segs, startsSentence(committed)));
            segs.forEach(sg => { if (live && sg.final && sg.cmd && !hf.done.has(sg.key)) { hf.done.add(sg.key); command = command || sg.cmd; } });
          }
          if (command && live) setTimeout(() => hfCommand(command), 60);
        };
        rec.onspeechstart = () => { if (activeTextarea === textarea) armSilence(SILENCE_AFTER_SPEECH_MS); };
        rec.onerror = event => {
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            wantListening = false;
            feedback.textContent = "Microphone access was blocked.";
          } else if (event.error !== "aborted" && event.error !== "no-speech") {
            feedback.textContent = "Voice input is unavailable.";
          }
        };
        rec.onend = () => {
          if (recognition !== rec) return;
          if (wantListening && (isMobile || hf.on) && activeTextarea === textarea) {
            committed = textarea.value.trim();                                    // keep what is already written
            try { begin(); return; } catch (err) {}
          }
          resetButton();
        };
        rec.start();
      };
      try { begin(); } catch (err) { resetButton(); }
    });
  });

  // Clicking any other button (Back, Submit, ...) also switches dictation off
  document.addEventListener("click", e => {
    const b = e.target.closest("button");
    if (!b || b.classList.contains("hf-btn")) return;
    if (activeButton && b !== activeButton && !b.hasAttribute("data-dictate-for")) stopDictation();
    else if (hf.on && !b.hasAttribute("data-dictate-for") && !b.closest(".hf-panel")) hfEnd("Hands-free stopped.");
  });

  /* ============ HANDS-FREE: answer every question by voice ============ */
  // Steps: 0 worked, 1 challenge, 2 plan, 3 scores, 4 notes, 5 ready to submit.
  const HF_TEXT = ["worked", "challenge", "plan", null, "notes"];
  const HF_TOTAL = 5;
  const NUM = { one: 1, won: 1, "1": 1, two: 2, to: 2, too: 2, "2": 2, three: 3, "3": 3, four: 4, for: 4, fore: 4, "4": 4, five: 5, "5": 5 };
  const SCORE_RE = /\b(overall|resources?|engagement|clarity|objectives?)(?:\s+(?:rating|score|is|to|as|of))*\s+(one|won|two|to|too|three|four|for|fore|five|[1-5])\b/gi;
  const END_PUNCT = "[\\s.,!?]*$";
  const CMD_RES = [
    ["stop", new RegExp("(?:^|\\s)stop (?:hands[- ]?free|listening)" + END_PUNCT, "i")],
    ["submit", new RegExp("(?:^|\\s)(?:submit|send) (?:the )?feedback" + END_PUNCT, "i")],
    ["prev", new RegExp("(?:^|\\s)(?:go (?:to )?(?:the )?)?(?:previous|last) question" + END_PUNCT, "i")],
    ["next", new RegExp("(?:^|\\s)(?:go (?:to )?(?:the )?)?next question" + END_PUNCT, "i")]
  ];
  // Splits a spoken command off the end of a phrase: "it went well next question" -> text "it went well", cmd "next"
  function pullCommand(text) {
    for (const [cmd, re] of CMD_RES) {
      const m = re.exec(text);
      if (m) return { text: text.slice(0, m.index).trim(), cmd };
    }
    return { text, cmd: null };
  }

  const hfEl = y => ({
    btn: document.getElementById(y + "-hf-toggle"), status: document.getElementById(y + "-hf-status"),
    panel: document.getElementById(y + "-hf")
  });
  const hfSection = (y, i) => document.getElementById(i === 3 ? y + "-pulse" : i === 5 ? y + "-final" : y + "-" + HF_TEXT[i]).closest(".question-section");
  function hfLabel(y, i) {
    if (i === 5) return "Ready to submit." + (document.getElementById(y + "-week").value.trim() ? "" : " Fill in the Week box at the top first.") + " Say “submit feedback” to send, or “previous question” to review.";
    if (i === 3) return "Question 4 of 5: scores. Say “overall four”, “resources three”, “engagement five”, “clarity four”, then “next question”.";
    const q = document.querySelector(`label[for="${y}-${HF_TEXT[i]}"]`);
    const n = i < 3 ? i + 1 : 5;
    return "Question " + n + " of " + HF_TOTAL + ": " + (q ? q.textContent.replace(/\s*\*\s*$/, "") : "") + " Say “next question” when you are done.";
  }
  function hfSay(y, msg, listening) {
    const el = hfEl(y); if (!el.status) return;
    el.status.hidden = !msg;
    el.status.innerHTML = (listening ? '<span class="hf-dot" aria-hidden="true"></span>' : "");
    el.status.appendChild(document.createTextNode(msg));
    if (listening) {
      const stop = document.createElement("button");
      stop.type = "button"; stop.className = "hf-btn hf-stop"; stop.textContent = "Stop";
      el.status.appendChild(stop);
    }
  }
  function hfMark(y, i) {
    document.querySelectorAll(".hf-active").forEach(n => n.classList.remove("hf-active"));
    if (i === null) return;
    const sec = hfSection(y, i);
    sec.classList.add("hf-active");
    try { sec.scrollIntoView({ behavior: "smooth", block: i === 5 ? "center" : "start" }); } catch (err) {}
  }
  function stopCmd() {
    const rec = hf.cmdRec; hf.cmdRec = null;
    if (rec) { try { rec.onend = null; rec.stop(); } catch (err) {} }
  }

  function hfStart(y) {
    const gate = document.getElementById(y + "-email");
    if (!document.getElementById(y + "-hf").classList.contains("revealed")) { gate.focus(); return; }
    if (activeButton) stopDictation();
    hf.on = true; hf.y = y;
    const el = hfEl(y);
    el.btn.querySelector("span").textContent = "Stop hands-free";
    el.panel.classList.add("hf-running");
    hfGo(0);
  }
  function hfEnd(msg) {
    if (!hf.on) return;
    const y = hf.y;
    hf.on = false; hf.token++; clearSilence(); stopCmd();
    hfMark(y, null);
    const el = hfEl(y);
    if (el.btn) { el.btn.querySelector("span").textContent = "Start hands-free"; el.panel.classList.remove("hf-running"); }
    hfSay(y, msg || "", false);
    if (activeButton) stopDictation();
  }
  function hfGo(i) {
    if (!hf.on) return;
    i = Math.max(0, Math.min(5, i));
    const y = hf.y, tok = ++hf.token;
    hf.idx = i;
    hf.switching = true;
    stopCmd();
    if (activeButton) stopDictation();
    hf.switching = false;
    hfMark(y, i);
    hfSay(y, hfLabel(y, i), true);
    clearSilence(); armSilence(SILENCE_AT_START_MS);
    setTimeout(() => {                                                   // a short breath so the microphone can switch over
      if (!hf.on || hf.token !== tok) return;
      if (i === 3 || i === 5) { hfListenCommands(i, tok); return; }
      const btn = document.querySelector(`[data-dictate-for="${y}-${HF_TEXT[i]}"]`);
      hf.switching = true; btn.click(); hf.switching = false;
      if (activeFeedback) activeFeedback.textContent = "Listening… say “next question” when you are done.";
    }, 280);
  }
  function hfCommand(cmd) {
    if (!hf.on) return;
    if (cmd === "next") { if (hf.idx < 5) hfGo(hf.idx + 1); }
    else if (cmd === "prev") hfGo(hf.idx - 1);
    else if (cmd === "stop") hfEnd("Hands-free stopped.");
    else if (cmd === "submit") {
      if (hf.idx !== 5) { hfSay(hf.y, "Finish the questions first, then say “submit feedback”.", true); return; }
      const y = hf.y;
      hfEnd("");
      document.querySelector(`#${y}-form button[type="submit"]`).click();
    }
  }

  // Scores and navigation (steps 3 and 5) have no text box, so they get their own small listener
  function hfListenCommands(i, tok) {
    const y = hf.y;
    const rec = new Recognition();
    hf.cmdRec = rec;
    rec.lang = "en-US";
    rec.continuous = !isMobile;
    rec.interimResults = false;
    rec.onresult = ev => {
      if (!hf.on || hf.token !== tok) return;
      armSilence(SILENCE_AFTER_SPEECH_MS);
      for (let k = ev.resultIndex; k < ev.results.length; k++) {
        if (!ev.results[k].isFinal) continue;
        const heard = ev.results[k][0].transcript;
        const set = [];
        if (i === 3) {
          let m; SCORE_RE.lastIndex = 0;
          while ((m = SCORE_RE.exec(heard))) { const n = NUM[m[2].toLowerCase()]; if (n && hfScore(y, m[1].toLowerCase(), n)) set.push(m[1].toLowerCase() + " " + n); }
          if (set.length) hfSay(y, "Set: " + set.join(", ") + ". " + hfLabel(y, 3), true);
        }
        const x = pullCommand(heard);
        if (x.cmd) { setTimeout(() => hfCommand(x.cmd), 60); return; }
        if (i === 5 && /submit|send/i.test(heard)) { hfSay(y, "Say exactly “submit feedback” to send.", true); }
      }
    };
    rec.onerror = ev => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") hfEnd("Microphone access was blocked.");
    };
    rec.onend = () => { if (hf.on && hf.cmdRec === rec && hf.token === tok) { try { rec.start(); } catch (err) {} } };
    try { rec.start(); } catch (err) { hfEnd("Voice input is unavailable."); }
  }
  function hfScore(y, key, n) {
    const id = /^overall/.test(key) ? "overall" : /^resource/.test(key) ? "resources" : /^engage/.test(key) ? "engagement" : "clarity";
    const el = document.getElementById(`${y}-${id}`);
    if (!el) return false;
    el.value = String(n);
    el.dispatchEvent(new Event(id === "clarity" ? "input" : "change", { bubbles: true }));
    return true;
  }

  ["year6", "year7"].forEach(y => {
    const el = hfEl(y);
    if (el.btn) el.btn.addEventListener("click", () => { if (hf.on) hfEnd("Hands-free stopped."); else hfStart(y); });
    if (el.status) el.status.addEventListener("click", e => { if (e.target.closest(".hf-stop")) hfEnd("Hands-free stopped."); });
  });
  // Leaving the form (Back to menu) also ends hands-free: handled by the "any other button" rule above.
}

/* ============ HELP & FAQ WINDOW ============ */
// The questions and answers come from config.js (faq). This short list is only a safety net.
const DEFAULT_FAQ = [
  { q: "How do I give my feedback?", a: "Choose Year 6 or Year 7, type your school email, answer the questions and press Submit feedback." },
  { q: "Can I speak instead of typing?", a: "Yes. Press Speak in the corner of any answer box, or use Hands-free at the top of the questions." }
];

function setupHelp() {
  const items = (Array.isArray(CFG.faq) && CFG.faq.length) ? CFG.faq : DEFAULT_FAQ;
  let overlay = null, lastFocus = null, prevOverflow = "";

  function close() {
    if (!overlay) return;
    const el = overlay; overlay = null;
    document.removeEventListener("keydown", onKey, true);
    document.body.style.overflow = prevOverflow;
    el.classList.remove("show");
    setTimeout(() => el.remove(), 260);
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (err) {} }
  }
  function onKey(e) {
    if (!overlay) return;
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    if (e.key === "Tab") {                                              // keep keyboard focus inside the window
      const f = overlay.querySelectorAll("button, summary");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  function open() {
    if (overlay) return;
    lastFocus = document.activeElement;
    overlay = document.createElement("div");
    overlay.className = "help-overlay";
    const card = document.createElement("div");
    card.className = "help-card"; card.setAttribute("role", "dialog"); card.setAttribute("aria-modal", "true"); card.setAttribute("aria-labelledby", "help-title");
    const top = document.createElement("div"); top.className = "help-top";
    const h = document.createElement("h2"); h.id = "help-title"; h.textContent = "Help & FAQ";
    const x = document.createElement("button"); x.type = "button"; x.className = "help-close"; x.setAttribute("aria-label", "Close help"); x.textContent = "×";
    top.append(h, x);
    const list = document.createElement("div"); list.className = "help-list";
    items.forEach(it => {
      const d = document.createElement("details"); d.className = "help-item";
      const s = document.createElement("summary"); s.textContent = it.q;
      const a = document.createElement("p"); a.textContent = it.a;
      d.append(s, a); list.appendChild(d);
    });
    // opening one question closes the others, so the window stays short
    list.addEventListener("toggle", e => {
      if (e.target.open) list.querySelectorAll("details[open]").forEach(o => { if (o !== e.target) o.open = false; });
    }, true);
    card.append(top, list); overlay.appendChild(card);
    x.addEventListener("click", close);
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });
    prevOverflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey, true);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => { if (overlay) { overlay.classList.add("show"); x.focus({ preventScroll: true }); } }));
  }

  // One floating Help button, always in the bottom-right corner, on every page
  const fab = document.createElement("button");
  fab.type = "button"; fab.className = "help-open help-fab"; fab.setAttribute("aria-haspopup", "dialog");
  fab.innerHTML = '<span class="help-q" aria-hidden="true">?</span><span>Help</span>';
  document.body.appendChild(fab);
  document.addEventListener("click", e => { if (e.target.closest && e.target.closest(".help-open")) open(); });
}

/* ============ SPEAK BUTTON GLOW ============ */
// The glow only animates while it is on screen, which keeps phones smooth.
function setupDictationGlow() {
  const wraps = document.querySelectorAll(".dictate-wrap");
  if (!("IntersectionObserver" in window)) { wraps.forEach(w => w.classList.add("in-view")); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => en.target.classList.toggle("in-view", en.isIntersecting));
  }, { rootMargin: "80px" });
  wraps.forEach(w => io.observe(w));
}

/* ============ AFTER SUBMIT: CONFETTI + THANK-YOU BOX ============ */
const CONFETTI_COLORS = {
  year6: ["#fff37b", "#67e8f9", "#ffffff", "#35c9f4", "#9decE5"],
  year7: ["#52d9ca", "#658ff1", "#9decE5", "#ffffff", "#bfe3ff"]
};

// One short, light shot from both bottom corners. Skipped for people who prefer reduced motion.
function fireConfetti(colors) {
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const W = window.innerWidth, H = window.innerHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas"; canvas.setAttribute("aria-hidden", "true");
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  document.body.appendChild(canvas);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rand = (a, b) => a + Math.random() * (b - a);
  const g = H * 1.7;                                         // gravity, px per second squared
  const perSide = W < 640 ? 26 : 36;                         // fewer pieces on phones
  const pieces = [];
  [1, -1].forEach(dir => {                                   // 1 = left corner (flies right), -1 = right corner (flies left)
    for (let i = 0; i < perSide; i++) {
      const peak = rand(0.28, 0.6) * H;                      // how high this piece flies
      const vy = -Math.sqrt(2 * g * peak), airtime = (2 * -vy) / g;
      const reach = rand(0.18, 0.68) * Math.min(W * 0.8, H); // how far it travels sideways
      pieces.push({
        x: dir > 0 ? 6 : W - 6, y: H - 6, vx: dir * reach / airtime, vy,
        w: rand(6, 11), h: rand(3.5, 6.5), dot: Math.random() < 0.25,
        rot: rand(0, Math.PI * 2), vr: rand(-9, 9), flip: rand(6, 12), sway: rand(3, 7),
        color: colors[Math.floor(Math.random() * colors.length)],
        life: rand(1.9, 2.6), delay: rand(0, 0.12)
      });
    }
  });

  let last = null, t = 0;
  function frame(now) {
    if (last === null) last = now;
    const dt = Math.min((now - last) / 1000, 0.05); last = now; t += dt;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of pieces) {
      const age = t - p.delay;
      if (age < 0) { alive = true; continue; }
      if (age > p.life) continue;
      alive = true;
      p.vy += g * dt; p.vx *= Math.exp(-0.6 * dt);
      p.x += (p.vx + Math.sin(age * p.sway) * 14) * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      const fadeFrom = p.life * 0.6;
      ctx.globalAlpha = age > fadeFrom ? Math.max(0, 1 - (age - fadeFrom) / (p.life - fadeFrom)) : 1;
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if (p.dot) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2.6, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.scale(1, Math.cos(age * p.flip)); ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      ctx.restore();
    }
    if (alive && t < 3.2) requestAnimationFrame(frame); else canvas.remove();
  }
  requestAnimationFrame(frame);
  setTimeout(() => canvas.remove(), 5000);                   // safety net
}

// Glass thank-you box. The page behind is blurred slightly until the box is closed.
function showThanks(y, returnTo) {
  if (document.querySelector(".thanks-overlay")) return;
  const c = YEARS[y];
  const overlay = document.createElement("div");
  overlay.className = "thanks-overlay";
  overlay.innerHTML = `
    <div class="thanks-card" role="dialog" aria-modal="true" aria-labelledby="thanks-title" aria-describedby="thanks-text">
      <div class="thanks-badge" style="${c.submitBtn}"><svg viewBox="0 0 24 24" fill="none" stroke="${c.submitTxt}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path class="thanks-check" pathLength="1" d="M5.5 12.5l4.2 4.2L18.5 7.5"/></svg></div>
      <p class="t-kicker mb-2 uppercase" style="font-size:14px;">${c.kicker}</p>
      <h2 id="thanks-title" class="t-title" style="font-size:28px;line-height:1.2;">Thank you for your feedback</h2>
      <p id="thanks-text" class="t-intro mt-3" style="font-size:16px;">Your ${c.label} reflections have been saved. They help us improve together.</p>
      <button type="button" class="thanks-close mt-6 inline-flex items-center justify-center gap-2 rounded-2xl px-8 py-3 font-bold shadow-lg" style="${c.submitBtn}"><span style="color:${c.submitTxt};">Back to main page</span></button>
    </div>`;
  const closeBtn = overlay.querySelector(".thanks-close");
  let closed = false;
  const close = (goHome) => {
    if (closed) return; closed = true;
    if (goHome === true) showView("menu-view");               // the button takes the teacher back to the main page
    document.removeEventListener("keydown", onKey, true);
    overlay.classList.remove("show");                        // box and blur fade away together
    setTimeout(() => overlay.remove(), 320);
    if (goHome !== true && returnTo && returnTo.focus) { try { returnTo.focus({ preventScroll: true }); } catch (err) {} }
  };
  const onKey = e => {
    if (e.key === "Escape") { e.preventDefault(); close(false); }
    else if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); }   // only one control: keep focus inside the box
  };
  closeBtn.addEventListener("click", () => close(true));
  overlay.addEventListener("click", e => { if (e.target === overlay) close(false); });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => requestAnimationFrame(() => { overlay.classList.add("show"); closeBtn.focus({ preventScroll: true }); }));
}

function celebrate(y) {
  const submit = document.querySelector(`#${y}-form button[type="submit"]`);
  try { showThanks(y, submit); } catch (err) { console.error("Thank-you box failed:", err); }
  try { fireConfetti(CONFETTI_COLORS[y]); } catch (err) { console.error("Confetti failed:", err); }
}

document.addEventListener("DOMContentLoaded", () => {
  // Menu first, so it always works
  document.getElementById("open-year6").addEventListener("click", () => showView("year6-view"));
  document.getElementById("open-year7").addEventListener("click", () => showView("year7-view"));

  try {
    Object.entries(YEARS).forEach(([y, c]) => { renderYear(y, c); setupForm(y); });
    ["year6", "year7"].forEach(y => document.getElementById("back-" + y).addEventListener("click", () => showView("menu-view")));
  } catch (err) { console.error("Form setup failed:", err); }

  try { setupOutbox(); } catch (err) { console.error("Outbox setup failed:", err); }
  try { setupHelp(); } catch (err) { console.error("Help setup failed:", err); }
  try { setupDictation(); } catch (err) { console.error("Dictation setup failed:", err); }
  try { setupDictationGlow(); } catch (err) { console.error("Dictation glow failed:", err); }
  try { lucide.createIcons(); } catch (err) { console.error("Icons failed:", err); }

  // Mouse: the background circles ease slowly toward a spot opposite the pointer (no effect on touch screens)
  try {
    if (!window.matchMedia("(hover: hover)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const root = document.documentElement;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      root.style.setProperty("--px", cx.toFixed(3)); root.style.setProperty("--py", cy.toFixed(3));
      raf = (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) ? requestAnimationFrame(tick) : 0;
    };
    document.addEventListener("pointermove", e => {
      if (e.pointerType === "touch") return;
      tx = (e.clientX / window.innerWidth) * 2 - 1; ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  } catch (err) { console.error("Mouse effect failed:", err); }
});
