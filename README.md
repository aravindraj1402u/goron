# MEMORYVAULT AI — static website build

MemoryVault AI preserves project knowledge — reports, failures and solutions — so the next
student batch starts ahead. This repository is a **static build** of the original Flask
application, converted so it can be hosted on any static host (GitHub Pages, Netlify, Vercel)
with no server.

## What changed from the Flask app
The original was a Flask + SQLite app with server-side Jinja templates. For a static host it was
rebuilt as plain HTML/CSS/JS:

- Every page of the app is now its own static HTML file (`index.html`, `dashboard.html`, `projects.html`, `project.html`, `failures.html`, `failure.html`, `search.html`, `handover.html`, `chat.html`, `admin.html`, `login.html`, `register.html`, `new-project.html`, `new-failure.html`, `my-documents.html`).
- The seed/demo data is baked into `js/data.js`.
- The search, handover-guide generator and the AI-assistant fallback logic are ported to
  `js/app.js`, so they run in the browser. Login is simulated with `localStorage`.
- Look and feel are unchanged (same Bootstrap theme and `css/style.css`).

## Demo accounts
- Faculty: `demo@memoryvault.local` / `demo1234`
- Admin:   `admin@memoryvault.local` / `admin1234`

(You can also register a new account — it is stored only in your browser.)

## Limitations of the static build
No backend means: no real authentication, no file uploads / PDF-DOCX text extraction, no shared
database, and no live LLM call (the assistant runs the labelled search-only fallback mode). For
those, deploy the original Flask app.

## Run locally
Open `index.html` in a browser, or serve the folder:

    python -m http.server 8000

## Layout
    index.html ...      pages
    css/style.css       theme
    js/data.js          demo data
    js/app.js           page rendering, search, handover, chat
