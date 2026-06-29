# Deploying pearbrowser.com

This is a **static site** — plain HTML/CSS at the repo root, no build step. Files:

```
index.html  features.html  apps.html  docs.html   ← pages
site-manifest.json                                 ← Hyperdrive/publish metadata
assets/styles.css                                  ← shared design system
vercel.json                                        ← Vercel static config (pretty URLs + asset caching)
```

The repo is already on GitHub: `https://github.com/bigdestiny2/pearbrowser-com`.
Both hosts below connect to that repo and **auto-deploy on every push**.

---

## Option A — Vercel

1. Go to **vercel.com → Add New → Project** and **Import** the `pearbrowser-com` repo.
2. Settings:
   - **Framework Preset:** Other
   - **Build Command:** *(leave empty)*
   - **Output Directory:** `.` (root) — or leave default
   - **Root Directory:** `./`
3. Click **Deploy**. `vercel.json` enables clean URLs (`/features`) and long-cache for `/assets`.
4. **Custom domain:** Project → Settings → Domains → add `pearbrowser.com`. Vercel shows the DNS
   records to set (apex `A 76.76.21.21`, or use Vercel nameservers; `www` → CNAME `cname.vercel-dns.com`).

Every `git push` to the default branch redeploys automatically.

---

## Option B — Render

1. Go to **render.com → New → Static Site** and connect the `pearbrowser-com` repo.
2. Settings:
   - **Build Command:** *(leave empty)*
   - **Publish Directory:** `.` (root)
3. Click **Create Static Site**.
4. **Custom domain:** Settings → Custom Domains → add `pearbrowser.com`, then set the DNS
   record Render gives you (apex via ANAME/ALIAS or `A` to Render's IP; `www` → CNAME to the
   `onrender.com` host).

Every push redeploys automatically.

---

## Local preview
Just open `index.html` in a browser, or serve the folder:
`python3 -m http.server` → http://localhost:8000

Before deploying, run `npm run check`; it validates release metadata, the linked manifest, and local static references across all pages.
