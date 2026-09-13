# Hourglass, as a PWA

A daily time tool for four failure modes: not seeing time pass, not being able to start, not being able to stop, and planning a day that was never going to fit.

No build step, no framework, no dependencies, no backend. Five static files.

```
index.html              the whole app
manifest.webmanifest    name, icons, standalone display
sw.js                   offline shell cache
icons/                  192, 512, maskable 512, dark 512
```

## Deploy

It needs HTTPS and a real origin. Service workers do not register from `file://`, and without one there is no install prompt and no offline.

Any static host works. Upload the four items to the root of a site and open it.

- GitHub Pages: push to a repo, enable Pages on the branch root, done.
- Netlify or Cloudflare Pages: drag the folder onto the dashboard.
- Your own server: copy to the web root. No config needed beyond HTTPS.

If you serve it from a subdirectory, the relative paths already handle it. Do not change them to absolute paths unless you also change `scope` and `start_url` in the manifest.

## Local testing

```
cd hourglass-pwa
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Service workers are allowed on `localhost` without TLS, which is the one exception.

## Installing

- Android Chrome: an install prompt appears, or use the browser menu. The Settings tab also shows an Install button once the browser offers one.
- iOS Safari: Share, then Add to Home Screen. iOS does not fire an install prompt, so the in-app button will not appear there.
- Desktop Chrome or Edge: install icon in the address bar.

## What actually works, and what does not

**Works offline.** After the first load the shell is cached. Your data was never on a network to begin with, unless you turn sync on (below).

**Data is local by default.** `localStorage` on the device, under the key `hourglass:state:v2`. Settings has an Export button that writes a JSON file, which is a backup even if you never turn sync on. Clearing site data, or deleting the installed app on iOS, deletes everything on that device.

**Sync is opt-in.** Settings has a "Turn on" button that generates a random pairing code and starts pushing your state to a small backend (Supabase). Entering that same code on another device links it to the same copy; whichever device saved most recently wins on conflict, there is no merge. The code is the only credential — nobody else can read or write that row without it, and the backend has no other access to the table (Row-Level Security, deny by default, unlockable only through two functions that require the exact code). Turning sync off on a device just stops that device from pushing or pulling; it does not delete the shared copy.

**Notifications are partial, and this is the real limitation.** The browser will show an alert while the app is backgrounded but still alive. It will not show one once the OS has suspended the app, because scheduling a notification for a future time is not something browsers support. The Notification Triggers API was designed for exactly this and never shipped past an origin trial. Verify the current state before assuming it is still true; this is the kind of thing that changes.

Three mitigations are already in the build:

1. A screen wake lock while a task is running, which is also what keeps the timer alive. Requires the Screen Wake Lock API; verify support on your target browser.
2. A foreground notification for the interval nudge and the overrun, delivered when the app is backgrounded rather than suspended.
3. A catch-up message when you return, stating how long you were away. This is not a workaround so much as the correct behaviour for a tool about time blindness.

If reliable background alerts turn out to be the thing you need, a PWA will not get you there without a push server, and at that point a native wrapper is the cheaper answer.

**iOS specifics.** Web push on iOS only works for apps added to the Home Screen, and that path still needs a server. Audio needs a user gesture before it will play, which the first tap on a start button provides.

## Changing it

Everything is in `index.html`. Constants at the top of the script: `KEY`, `EST_OPTS`, and the defaults in `blank()` for day end, multiplier, switching cost, and nudge interval.

Bump `CACHE` in `sw.js` on every deploy. If you do not, returning users keep the previously cached shell.

## What this is not

It is not a clinically validated intervention. Time perception differences in ADHD are well documented, but the specific mechanics here, the two-minute start, the 1.5x multiplier, the five-minute switching buffer, the transition countdown, are design hypotheses. They are cheap and reversible on purpose. Treat the numbers as starting points to be replaced by your own, which is what the Review tab is for.
