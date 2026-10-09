/* ==========================================================================
   IPT FEEDBACK SETTINGS
   This is the one file you edit for everyday changes. Save it, upload it to
   GitHub, and the whole site follows: the meetings box, the calendar,
   the "Feedback this week" box, the form, and the Help & FAQ window.
   Keep the quotes " " and commas , exactly as they are.
   ========================================================================== */
window.IPT_CONFIG = {

  /* ----- Where feedback is sent (your Formspree form address) ----- */
  formEndpoint: "https://formspree.io/f/xbglqzql",

  /* ----- Only school emails ending with this can open the questions ----- */
  emailDomain: "bilfen.k12.tr",

  /* ----- Online meetings ----- */
  timezone: "Europe/Istanbul",                        // the time zone the meeting times below are written in
  meetingLink: "https://meet.google.com/ohd-bjdt-bdo", // the Join Meeting button opens this
  // One line per meeting.  year: 6 or 7   day: Mon Tue Wed Thu Fri Sat Sun   times: 24-hour "HH:MM"
  meetings: [
    { year: 7, day: "Mon", start: "16:45", end: "17:15" },
    { year: 6, day: "Mon", start: "17:40", end: "18:10" }
  ],

  /* ----- School rotation (calendar and "Feedback this week") ----- */
  rotation: {
    cycleStart: "2026-10-05",                         // the Monday when the first group starts (YYYY-MM-DD, must be a Monday)
    // Year 6: one group of schools per Monday, repeating forever. Year 7 uses the same list from the bottom up.
    year6: [
      ["Antalya", "Ataşehir"],
      ["Bahçeşehir", "Bornova"],
      ["Bursa", "Çamlıca"],
      ["Çayyolu", "Çukurambar"],
      ["Esenşehir", "İncek"],
      ["Maslak", "Sancaktepe", "Kurtköy"]
    ]
  },

  /* ----- Help & FAQ window (the "Help" button). Add, remove or reword any question. ----- */
  faq: [
    { q: "How do I give my feedback?",
      a: "Choose Year 6 or Year 7, then type your school email. The questions open as soon as your email ends with @bilfen.k12.tr. Answer them, then press Submit feedback." },
    { q: "Which email should I use?",
      a: "Your Bilfen school address, the one ending with @bilfen.k12.tr. Other addresses cannot open the questions." },
    { q: "Which schools are giving feedback this week?",
      a: "The Feedback this week box on the main page shows the schools for the coming Monday. The calendar shows every feedback Monday: tap or hover a highlighted Monday to see its schools." },
    { q: "Can I speak my answers instead of typing?",
      a: "Yes. Press Speak in the corner of any answer box, talk, and press Stop. You can say comma, full stop or question mark to add punctuation. Or use Hands-free: say next question to move on, previous question to go back, scores like overall four, and submit feedback to send. Your browser will ask for microphone permission the first time. Chrome works best." },
    { q: "I refreshed the page. Did I lose my answers?",
      a: "No. Your answers are saved on this device while you write and come back when you reopen the page. Use Clear draft to remove them, especially on a shared computer." },
    { q: "My internet dropped when I pressed Submit.",
      a: "Your reflection is kept on this device and sent automatically when the connection returns. A small note at the bottom right shows it is waiting, with a Send now button. Keep the page open until it says it was sent." },
    { q: "When are the online meetings?",
      a: "The Online meetings box lists the times. The Join Meeting button and the Next meeting banner shine from 15 minutes before a meeting until it ends." },
    { q: "Who receives my feedback?",
      a: "It is sent by email to the IPT lesson planner together with the school email address you entered, so they can follow up if needed." }
  ]
};
