# Game Hub

## Structure
```
index.html          ← the hub page (grid of games)
games/
  snake.html         ← one placeholder game (replace with your real ones)
  <your-game>.html
```

## Adding a new game
1. Drop your game's HTML file into `games/`.
2. Open `index.html`, find the `GAMES` array near the bottom (inside the `<script>` tag).
3. Add a line like:
   ```js
   { name: "Neon Runner", file: "neon-runner.html", icon: "🚀", tag: "Arcade" }
   ```
   - `name` — shown on the tile
   - `file` — filename inside `games/`
   - `icon` — an emoji, or a path to an image (e.g. `games/icons/neon-runner.png`), or leave it out to show the game's first letter
   - `tag` — optional small label (genre etc.)

That's it — the tile appears in the grid automatically, in the order you listed it, and search filters it by name.
# Game Hub

## Structure
```
index.html          ← the hub page (grid of games + sign-in)
server.js            ← tiny Node server (static files + account API)
games/
  tetris.html
  snake.html
  2048.html
  space-invaders.html
credentials/         ← per-user password hash + salt (never served over HTTP)
profiles/             ← per-user display name / bio (never served over HTTP)
avatars/              ← per-user avatar image (served publicly, needed for <img>)
```

## Running it
This now includes a **real account system** — signing in, editing a profile,
and uploading an avatar all write actual files to disk, so it needs a tiny
server instead of just opening `index.html` directly.

```
node server.js
```

Then open **http://localhost:3000** in your browser. That's it — no npm
install, no dependencies. It uses only Node's built-in modules.

Opening `index.html` straight from the filesystem (`file://...`) will still
show the game grid fine, but the "Sign in" button won't work without the
server running, since there's nowhere for it to save accounts to.

## How accounts work
- **Sign up** creates `credentials/<username>.json` (a random salt + a
  scrypt password hash — never the plain password) and
  `profiles/<username>.json` (display name, bio, avatar filename).
- **Sign in** checks the password against that hash and hands back a
  session token, which the browser keeps in `localStorage`.
- **Avatar upload** decodes the image you pick and writes it straight to
  `avatars/<username>.<ext>`.
- Sessions live in the server's memory, so restarting `node server.js`
  signs everyone out (accounts and profiles themselves are untouched,
  since those are files on disk).
- `credentials/` and `profiles/` are explicitly blocked from being served
  over HTTP — only `avatars/` is public, since avatar images need to be
  loadable by `<img>` tags on the page.

## Adding a new game
1. Drop your game's HTML file into `games/`.
2. Open `index.html`, find the `GAMES` array near the bottom (inside the `<script>` tag).
3. Add a line like:
   ```js
   { name: "Neon Runner", file: "neon-runner.html", icon: "🚀", tag: "Arcade" }
   ```
   - `name` — shown on the tile
   - `file` — filename inside `games/`
   - `icon` — an emoji, or a path to an image (e.g. `games/icons/neon-runner.png`), or leave it out to show the game's first letter
   - `tag` — optional small label (genre etc.)

That's it — the tile appears in the grid automatically, in the order you listed it, and search filters it by name.

## The included games
All four (Tetris, Snake, 2048, Space Invaders) share one "Aurora" visual and
audio system: a hand-drawn night sky background, synthesized ambient music
and sound effects (Web Audio API — no external audio files), sound/info
modals, a pause overlay, and a "⌂" button in the header that returns to
this hub. Each has its own on-screen touch controls tuned for mobile, and
a desktop layout with side panels for stats.
