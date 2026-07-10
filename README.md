# Game Hub

## Structure
```
index.html                    ← the hub page (grid of games + sign-in)
netlify.toml                  ← Netlify build/redirect config
package.json                  ← @netlify/blobs dependency
netlify/functions/
  lib/shared.js                shared helpers (not itself an endpoint)
  signup.js    login.js         username + password auth
  google-auth.js                Google Sign-In (verify + auto-create account)
  me.js        profile.js       read / update the signed-in profile
  avatar-upload.js  avatar.js   upload + serve avatar images
  scores.js                     per-game high scores
games/
  tetris.html  snake.html  2048.html  space-invaders.html
  pong.html  memory-match.html  breakout.html
```

## Deploying on Netlify
Push this folder to a Git repo and connect it to Netlify (or drag-and-drop
deploy). Netlify reads `netlify.toml` automatically:
- `publish = "."` — serves `index.html` and `games/` as-is.
- `functions = "netlify/functions"` — deploys the account API as serverless functions.
- Netlify runs `npm install` during the build, which pulls in `@netlify/blobs`.

No database to provision — accounts, profiles, and avatars are stored in
**Netlify Blobs**, a key-value/file store built into your Netlify site. There's
nothing to configure for this part; it just works once deployed.

One thing you should set:
- **`SESSION_SECRET`** — Site configuration → Environment variables. Any long
  random string. This signs the sign-in tokens; without a custom value it
  falls back to a fixed dev string, which is fine for testing but not for
  a real deployment.

## Setting up Google Sign-In
1. Go to the [Google Cloud Console credentials page](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. Under **Authorized JavaScript origins**, add your Netlify URL (e.g.
   `https://your-site-name.netlify.app`).
4. Copy the Client ID into **two** places:
   - `GOOGLE_CLIENT_ID` in `index.html` (search for "GOOGLE SIGN-IN SETUP" near the top of the script).
   - A `GOOGLE_CLIENT_ID` environment variable in Netlify (Site configuration → Environment variables) — the function that verifies the sign-in needs it too.

Until you do this, the Google button on the sign-in modal just doesn't
appear — everything else (username/password accounts, scores, avatars)
works fine without it.

## How accounts work
- **Username + password**: scrypt password hash + random salt, stored in
  the `credentials` Blobs store. Never the plain password, never returned
  to the browser.
- **Google Sign-In**: the browser gets a Google ID token via Google
  Identity Services; a function verifies it directly with Google
  (`oauth2.googleapis.com/tokeninfo`) and either logs in or creates a new
  account, linked by the Google account's stable ID so repeat sign-ins
  always land on the same profile.
- **Sessions are stateless** — a signed token (HMAC, not a database row)
  that the browser keeps in `localStorage` and sends back as
  `Authorization: Bearer ...`. No server-side session storage, which
  suits serverless functions well (any function instance can verify any
  token without shared state).
- **Avatars** are stored as raw image blobs, one per user, served through
  a small function so they load like a normal image.
- **High scores** sync automatically: each game checks `localStorage` for
  a sign-in token, pulls your saved high score on load, and pushes a new
  one whenever you beat it. If you're signed in on two devices, both see
  the same scores.

## Gamepad support
A standard USB/Bluetooth gamepad (Xbox/PlayStation-style layout) works on
this hub page and every game: Tetris, Snake, 2048, Space Invaders, Pong,
Memory Match, and Breakout. Keyboard also works fully everywhere — you
can play any of these end to end without ever touching a mouse.

- **This hub page** — d-pad/left-stick (or arrow keys/WASD) moves a
  highlight across the game tiles, **A**/Enter opens the highlighted
  game, right stick scrolls the page. The highlight only appears once
  you touch the keyboard or a gamepad — move the mouse and it
  disappears again, since hover already does that job.
- **Tetris** — d-pad/left-stick moves, **A** or d-pad-up rotates
  clockwise, **B** rotates counter-clockwise, **X** holds, **Y** hard
  drops, d-pad-down soft-drops, **Start** pauses.
- **Snake** — d-pad/left-stick steers, d-pad left/right cycles pace
  (Calm/Steady/Swift/Turbo) and up/down toggles Wall/Portal edges on the
  start and game-over screens, **A**/**Start** begins or resumes.
- **2048** — d-pad/left-stick slides tiles, **A**/**Start** begins or
  resumes.
- **Space Invaders** — d-pad/left-stick moves, **A**/**B** fires,
  **Start** pauses.
- **Pong** — d-pad/left-stick moves your paddle, d-pad left/right cycles
  pace (Calm/Steady/Swift) on the start and game-over screens, **A**/**B**
  starts or resumes, **Start** pauses.
- **Memory Match** — d-pad/left-stick moves a highlight across the cards,
  **A** flips the highlighted card, d-pad left/right cycles difficulty on
  the start and game-over screens, **Start** pauses.
- **Breakout** — d-pad/left-stick moves the paddle, **A**/**B** launches
  the ball (or starts/resumes on the overlays), **Start** pauses.

On every game above, pressing **Select** while the game is **paused**
returns you to this hub — same as the ⌂ button, just gamepad-reachable
without unpausing first.

While steering with a keyboard or gamepad, the pause/start/game-over
screens also get a slightly heavier background blur — a small nod to
console-style "immersive" pause menus. Using a mouse or touch keeps the
lighter, crisper look.

No pairing step needed beyond your OS/browser already recognizing the
controller — just press any button once connected and these pages pick
it up. If a site embeds these pages in an iframe with gamepad access
blocked, they quietly fall back to keyboard/touch instead of erroring.

## Snake: Wall vs Portal edges
Snake now has an edge-mode toggle right next to the pace picker, on both
the start and game-over screens:
- **Wall** (default) — the classic rules; touching the border ends the run.
- **Portal** — touching any edge wraps the snake out the opposite side
  instead of ending the run, with a faint lavender glow around the board
  as a reminder it's active.

Switch it with the on-screen buttons, arrow-key up/down, or gamepad
up/down while either overlay is showing.

## Breakout power-ups
Certain bricks (about 1 in 9) drop a falling capsule when destroyed —
catch it with your paddle:
- **Triple ball** — splits every ball currently in play into three,
  fanned out in different directions. They never collide with each
  other. If your ball was a metal ball, all three copies are too.
- **Extra life** — one more chance, up to a cap of five.
- **Expand** — a wider paddle for about 12 seconds.
- **Machine gun** — the paddle auto-fires upward for about 10 seconds,
  chipping away at bricks it hits.
- **Metal ball** — plows straight through ordinary bricks without
  bouncing, but tougher (multi-hit) bricks still stop it: it destroys
  them in one shot and ricochets off, same as a normal ball would.

Bricks themselves now come in random colors independent of their
toughness — a brick's color no longer tells you how many hits it needs;
watch the hit-count border instead. Levels are dynamic too: the layout
rotates through several patterns (checkerboard, pyramid, diamond, rings,
and more) and gains extra rows every few levels, capped well short of
the paddle so it never becomes unfair even dozens of levels in. Ball
speed still ramps up with a long rally, but gently and with a hard cap,
so it stays playable instead of spiraling out of control.
long rally, but gently and with a hard cap, so it stays playable instead
of spiraling out of control.

## Adding a new game
1. Drop your game's HTML file into `games/`.
2. Open `index.html`, find the `GAMES` array (inside the `<script>` tag).
3. Add a line like:
   ```js
   { name: "Neon Runner", file: "neon-runner.html", icon: "🚀", tag: "Arcade" }
   ```
   - `name` — shown on the tile
   - `file` — filename inside `games/`
   - `icon` — an emoji, or a path to an image, or omit it to show the game's first letter
   - `tag` — optional small label (genre etc.)
4. If you want the new game's high scores to sync too, add its id to
   `KNOWN_GAMES` in `netlify/functions/scores.js`, and add a small
   `CloudSync` block to the game (copy the one from `pong.html` — it's
   about 20 lines and just needs a `GAME_ID` string changed).

The tile appears in the grid automatically, in the order you listed it,
and search filters it by name.

## The included games
All seven (Tetris, Snake, 2048, Space Invaders, Pong, Memory Match,
Breakout) share one "Aurora" visual and audio system: a hand-drawn night
sky background, synthesized ambient music and sound effects (Web Audio
API — no external audio files), sound/info modals, a pause overlay, and
a "⌂" button in the header that returns to this hub. Each has its own
on-screen touch controls tuned for mobile, a desktop layout with side
panels for stats, and (where it makes sense) gamepad support.