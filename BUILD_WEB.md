# PC version (web)

The app also runs in a desktop browser. On a wide screen it is shown as a centred phone-sized column (max 560 px) on a dark background; everything else is the same app, so F1, MotoGP and football all work.

## Try it on your PC
```
npm install
npm run sync
npm run web
```
Opens http://localhost:8081. Edit code and the page reloads.

## Publish it (so you can open it from any computer)
Option A, GitHub Pages (free, automatic): in the repo go to Settings > Pages > Source = "GitHub Actions", then push to `main`. The workflow `.github/workflows/web.yml` builds and publishes to `https://trollrap.github.io/f1-companion/`. Keep the repo public (it is).

Option B, any static host (Netlify, Vercel, Cloudflare Pages): `npm run build:web`, then upload the `dist` folder. If it is served from a sub-folder, add `"experiments": { "baseUrl": "/folder" }` inside `expo` in app.json first.

## What differs from the phone
- No push notifications or background alerts (browsers cannot schedule them while closed). Settings says alerts are off.
- "Save picture" in comparisons/predictions: Share/Save may fall back to a download.
- In-app update check is Android only and is hidden on the web.
- Favourites, predictions and settings are stored in that browser (not synced with the phone).
- Data sources must allow browser requests (CORS). Jolpica and OpenF1 do. The MotoGP timing service and ESPN (football) are unofficial and could not be checked from the build sandbox: if MotoGP or football show "could not load" on the web but work on the phone, the service blocks browsers; a small proxy would be needed, tell me and I will add one.
