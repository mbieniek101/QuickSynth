# QuickSynth

A pocket groovebox that runs in the browser and installs on an iPhone home screen as a full-screen, offline app.
It has three synthesized instruments (DRUM, BASS, LEAD) that play in sync. Each one has 16 patterns with chaining,
knobs, live recording, and hold-to-apply FX. There are no samples and no dependencies: just HTML, CSS and JS.

## Files
| File | What it is |
|---|---|
| `index.html` | Page layout |
| `style.css` | Look and feel |
| `app.js` | Audio engine, sequencer, UI |
| `manifest.webmanifest`, `icons/` | Makes it installable |
| `sw.js` | Offline caching (bump `CACHE` version when you change files) |

## Try it on your PC
```
python -m http.server 8000
```
Open http://localhost:8000.

## Put it on your iPhone (permanent, free)
iPhone needs the app served over **HTTPS**. GitHub Pages is free and permanent:

1. Create a free account at github.com and make a new **public** repository, e.g. `quicksynth`.
2. On the repo page click **Add file → Upload files** and drag in everything from this folder
   (including the `icons` folder). Commit.
3. Go to **Settings → Pages**, set *Source* to **Deploy from a branch**, branch **main**, folder **/ (root)**. Save.
4. After about a minute your app is live at `https://<your-username>.github.io/quicksynth/`.
5. On the iPhone, open that link in **Safari** → **Share** → **Add to Home Screen**.

It now launches full-screen from its icon, works offline, and keeps your patterns on the phone.
Use **⋯ → Export all** now and then to back up your songs.

### Updating
Upload changed files to the repo, and bump `CACHE = 'quicksynth-v7'` in `sw.js` to `v8`, `v9` and so on.
The phone picks up the new version the next time it opens the app online, after one or two launches.

## Notes
- Audio plays even with the silent switch on (Safari 17+ `audioSession` API).
- Patterns are stored per-app on the phone. Deleting the home-screen icon deletes them, so export first.
- Font: Rajdhani (SIL Open Font License 1.1, from Google Fonts), bundled in `fonts/` and cached for offline use.
