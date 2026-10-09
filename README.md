# IPT Feedback

Static site (HTML/CSS/JS) hosted on GitHub Pages.

## Files
- `index.html`: main page (menu + schedule calendar area)
- `style.css`: styles
- `script.js`: Year 6 / Year 7 forms, dictation, and sending to Formspree
- `calendar.js`: Monday schedule calendar (edit `CYCLE_START` and the school lists at the top)
- `assets/`: put `logo-menu.png`, `logo-year6.png`, `logo-year7.png` here

## Submissions
Responses are sent to Formspree. The endpoint is `FORM_ENDPOINT` on line 3 of `script.js`.

## Publish
Settings > Pages > Deploy from a branch > `main` / root.
