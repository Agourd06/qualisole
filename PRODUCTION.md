# Running QualiSol Frontend in Production

## 1. Prerequisites

- **Node.js** 18+ and npm (or pnpm/yarn)
- Production API URL for the backend

## 2. Set environment variables

Create a `.env` file in the project root (or set env vars in your CI/hosting):

```bash
# Production API (no trailing slash; the app appends /api for requests)
VITE_API_BASE_URL=https://your-production-api.example.com/api
```

If you omit this, the app may fall back to the stage URL or fail depending on your `constants.ts` setup.

## 3. Install dependencies

```bash
npm ci
```

Use `npm ci` in production for a clean, reproducible install from `package-lock.json`.

## 4. Build

```bash
npm run build
```

This runs `tsc && vite build`, type-checks the project, and outputs static files to **`dist/`**.

## 5. Serve the built app

The `dist/` folder contains the production build. Serve it with any static file server.

### Option A: Local preview (quick test)

```bash
npm run preview
```

Uses Vite’s preview server (default port 4173). Good to verify the build before deploying.

### Option B: Simple static server (e.g. Node)

```bash
npx serve dist -s -l 3000
```

- `-s` = single-page app (serve `index.html` for unknown routes)
- `-l 3000` = listen on port 3000

### Option C: Nginx

Example minimal config:

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /path/to/qualsolfront/dist;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Optional: cache static assets
  location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
  }
}
```

`try_files ... /index.html` is required so client-side routes (e.g. `/qualiphoto`, `/map`) work on refresh and direct links.

### Option D: Deploy to a platform

- **Vercel / Netlify:** Point the project root to this repo, set **Build command** to `npm run build` and **Output directory** to `dist`. Set `VITE_API_BASE_URL` in the dashboard.
- **Docker:** Use a multi-stage build: `node` to run `npm ci && npm run build`, then copy `dist/` into an `nginx` or `serve` image and serve it.

## 6. Checklist

| Step | Action |
|------|--------|
| 1 | Set `VITE_API_BASE_URL` to your production API base (with `/api` if that’s your backend path). |
| 2 | Run `npm ci` then `npm run build`. |
| 3 | Serve the contents of `dist/` with a static server. |
| 4 | Ensure SPA routing: all non-file routes serve `index.html`. |
| 5 | Use HTTPS in production. |
| 6 | Confirm CORS and auth (cookies/tokens) work with your backend domain. |

## Subpath deployment (e.g. `https://example.com/app/`)

If the app is not at the root:

1. In **Vite**: set `base: '/app/'` in `vite.config.ts` (create one if missing).
2. In **React Router**: use `<BrowserRouter basename="/app">` in `AppRoutes.tsx`.
3. In **Nginx**: set `root` (or `alias`) so that `/app/` serves the same `dist/` content and `try_files` still falls back to `index.html` for `/app/*`.

Then rebuild and redeploy.

## Map and Arabic text in preview / production

If the map looks correct locally but place names (including Arabic) appear garbled in preview or production:

1. **Encoding** – The app uses UTF-8. `index.html` includes `<meta charset="UTF-8">` and `Content-Type` meta. Ensure your **host** serves the page with `Content-Type: text/html; charset=utf-8` (Nginx, Vercel, Netlify, etc. usually do by default; custom servers may need to set this).
2. **Same browser** – Compare in the same browser (e.g. Chrome) locally and in preview to rule out font/rendering differences.
3. **Tiles** – Map labels come from OpenStreetMap tile images. If tiles load (check Network tab for `tile.openstreetmap.org`), they should be identical in dev and preview. Hard-refresh (Ctrl+Shift+R) in preview to avoid stale cache.
4. **No image processing** – If you use a CDN or proxy that reprocesses images (resize, re-encode), ensure it does not alter tile PNGs or their URLs.
