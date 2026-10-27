# CoverKit

Beautiful assignment cover pages for NSU students. Fill in the form, watch the A4 cover update live, and download it as a PDF. Free and open source.

**Live site:** https://coverkit.parvezdev.workers.dev

## Features

- Live A4 cover preview that updates as you type
- Workspace-first layout: the first screen is only the nav, preview and grouped form (Category & Template, Submitted by, Course details, Submitted to); the intro, FAQ and a note from the developer live below the fold
- Document types: Assignment, Lab Report, Project Report, Term Paper, Report
- Six cover templates — Classic, Minimal, Formal, Academic, Frame and Arch — in a scrolling picker under Category & Template, with a larger “See all” gallery
- Five color modes (Black & white, NSU blue, Forest, Maroon, Teal) that recolor every template, plus a logo switch: full-color or black & white NSU seal (`logo.js`). Choices are saved and included in shareable links
- Group covers with up to 5 submitted-by members (names, IDs and serials stay aligned)
- One-click PDF download (the print dialog, Ctrl+P, also prints just the cover) — including a blank cover you can print and fill in by hand
- Course search across 1,200+ NSU courses: type a few letters of the course name (or the code, e.g. `MAT125`) in the Course name field and pick your course — name and code fill in together. Typing a code in the Course code field also autofills its name. The catalog lives in `courses.js` (see *Course data* below); pairs a student adds or corrects are remembered in their own browser
- Your details auto-save in your browser, so they are still there next time
- Installable (PWA) and works offline after the first visit
- Works on desktop and mobile, light and dark mode, no sign-up

## Privacy

- **Typing stays on the device.** Form details are stored only in the visitor's own browser (`localStorage`) so the form is pre-filled next time. Nothing is sent anywhere while typing.
- **Downloads are logged, minimally.** When a visitor presses **Download PDF** and the PDF is saved, the site owner's database records the cover design (template and color) and, for the first submitted-by person only, their name and student ID — and only when the name looks real and the ID is a valid 10-digit NSU ID (a "verified" download). Blank or invalid downloads keep just the design. Course, faculty, group members, dates and browser strings are not stored; a salted hash of the IP is kept only for rate limiting. The purpose is ranking designs by how many real students use them. Records are visible only to the site owner in a private admin page behind Cloudflare Access, are never sold or shared, and are deleted on request. The site shows a notice next to the Download button and explains this in the FAQ.
- **Feedback is optional.** Messages sent through the feedback popup (category, optional rating, message, optional reply email) are stored in the same private database.
- **Share links carry the form.** A shareable link contains everything currently in the form, encoded in the link itself — only send one to people you mean to share those details with.

> Forking CoverKit? The download log is part of the design (see `downloads.js`). If you would rather not keep it, delete the `logDownload(...)` call in `app.js` and the `/api/downloads` route in `worker.js`, and update this section.

## Course data

`courses.js` is a generated `[code, title]` list of 1,225 NSU courses used for search and autofill. It is built from:

- The [Shohoj](https://github.com/souravmondalshuvo/Shohoj) NSU course dataset (MIT License, © 2026 Sourav Mondal Shuvo), itself compiled from NSU's official offered-course lists (Summer/Fall 2025 and Fall 2026 snapshots) and published curricula.
- Official NSU programme and curriculum pages (`northsouth.edu`, `ece.northsouth.edu`) for courses the offered lists never print titles for — the M.Sc. in Civil Engineering (CE) catalogue, MS Biotechnology codes, and several dozen per-department titles.

Seven offered codes (ENG090, ENG092, ETE597, MCJ406, MCJ407, MCJ420, MCJ420L) have no verifiable official title yet, so they ship code-only: they still appear in code search, and the student types the name (which their browser then remembers). One low-confidence exception is CSE146, listed as “Introduction to Cybersecurity” from a public student course listing because no official title could be verified. Course names themselves belong to North South University; the list is a convenience index, not an official NSU publication.

## Run locally

The front end is a plain static site. Serve the folder with any local server, for example:

```bash
python -m http.server 8000
```

Then open http://localhost:8000. Opening `index.html` directly from the folder can break the PDF export in some browsers, so a local server is recommended. The feedback and download-log endpoints answer `503`/fail silently on a plain static server — covers still generate and download normally.

To exercise the Worker + database locally, use Wrangler instead (see Deploy below): `wrangler dev` serves the Worker, and a local D1 database can be created with `wrangler d1 execute coverkit --local --file=schema.sql`.

## Deploy (Cloudflare Workers + D1)

1. Install Wrangler and log in: `npm i -g wrangler && wrangler login`
2. Create the database and tables:
   ```bash
   wrangler d1 create coverkit
   wrangler d1 execute coverkit --remote --file=schema.sql
   ```
3. Copy `wrangler.toml.example` to `wrangler.toml` and paste in the `database_id` from step 2.
4. Protect `/admin` with **Cloudflare Access** (Zero Trust → Access → Applications) and set the Worker variables `ACCESS_TEAM` (your `<team>` in `<team>.cloudflareaccess.com`) and `ACCESS_AUD` (the application's Audience tag). The admin page verifies the Access JWT itself, so it stays locked even if the Access rule is removed by mistake.
5. Optional spam protection for feedback: create a **Cloudflare Turnstile** widget, put the site key in `TURNSTILE_SITEKEY` at the top of `app.js`, and the secret in the Worker (`wrangler secret put TURNSTILE_SECRET`). Set both or neither.
6. Optional: `wrangler secret put IP_SALT` with any random string to salt the hashed IPs with your own value.
7. Deploy: `wrangler deploy`
8. Bump `VERSION` in `sw.js` whenever you ship front-end changes, so installed/offline users pick up the new shell.

### How it is wired

| Path | Handler | Notes |
|---|---|---|
| `/` and everything else | static assets (`env.ASSETS`) | `.assetsignore` keeps Worker modules and docs unpublished |
| `POST /api/feedback` | `feedback.js` | honeypot + optional Turnstile + per-IP rate limit → D1 `feedback` |
| `POST /api/downloads` | `downloads.js` | one record per completed download → D1 `downloads` |
| `GET/POST /admin` | `admin.js` | private feedback inbox + download log (stats, top courses, intake cohorts, heavy users), behind Cloudflare Access |

Configuration you may want to edit lives at the top of `app.js`: `SUPPORT_URL` (Buy Me a Coffee link), `FEEDBACK_URL` (external feedback form instead of the built-in popup), `REPO_URL`, and `TURNSTILE_SITEKEY`. Cover template names/descriptions are the `TEMPLATES` list near the top of `app.js`, with their printed styles under “Cover templates” in `style.css`. The course catalog is `courses.js` — see *Course data* above.

## Tech

HTML, CSS and vanilla JavaScript — no build step. PDF export uses [html2canvas](https://html2canvas.hertzen.com/) and [jsPDF](https://github.com/parallax/jsPDF), loaded from a CDN on demand (first edit or download hover). The backend is a Cloudflare Worker with a D1 (SQLite) database; the admin page is server-rendered by the Worker.

## License

The code in this repository is released under the [MIT License](LICENSE).

**Fonts:** Overused Grotesk is included in `assets/fonts/` and is licensed separately under the SIL Open Font License 1.1. See `assets/fonts/OverusedGrotesk-LICENSE.txt`.

**NSU name and seal:** The North South University name and seal belong to North South University. They are used here for student convenience. This project is not affiliated with or endorsed by NSU, and the seal is not covered by the MIT License.

## Credits

Built by Parvez & Claude.
