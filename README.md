# Game Hub

## Structure
```
index.html              ← the hub page (grid of games + sign-in)
terms.html               ← Terms & Privacy page, linked from the footer
firebase-config.js       ← paste your Firebase project config here
gamehub-cloud.js          shared Firebase Auth + Firestore helper, used by
                          the hub and every game
games/
  tetris.html  snake.html  2048.html  space-invaders.html
  pong.html  memory-match.html  breakout.html
```

## Deploying on GitHub Pages
This is a plain static site — no build step, no server, no functions. To
deploy it:
1. Push this folder to a GitHub repo.
2. Repo → **Settings → Pages** → under "Build and deployment", set
   **Source** to "Deploy from a branch", pick your branch (e.g. `main`)
   and the root folder, then save.
3. GitHub gives you a URL like `https://your-username.github.io/your-repo/`.
   That's it — no further config on the GitHub side.

Accounts, profiles, avatars, and scores are handled by **Firebase**
(Google's free-tier-friendly backend-as-a-service), which runs entirely
from the browser — no server of your own required. You do need to set
up a Firebase project once; see below.

## Setting up Firebase (accounts, profiles, scores)
1. Go to the [Firebase console](https://console.firebase.google.com/) and
   create a new project (the free Spark plan is enough for this).
2. **Add a web app**: Project overview → the `</>` (web) icon → register
   an app (no need for Firebase Hosting — you're using GitHub Pages).
   Firebase will show you a `firebaseConfig` object.
3. Copy that object into **`firebase-config.js`** at the root of this
   project, replacing the placeholder values.
4. **Enable sign-in methods**: Build → Authentication → Get started →
   Sign-in method tab → enable **Email/Password** and **Google**.
5. **Add your GitHub Pages domain as authorized**: still in Authentication
   → Settings → Authorized domains → Add domain → paste your
   `your-username.github.io` domain (Google Sign-In's popup won't work
   from an unlisted domain).
6. **Create the database**: Build → Firestore Database → Create database
   → start in production mode (the security rules below lock it down
   properly either way).
7. **Set Firestore security rules** — Firestore Database → Rules tab,
   replace the contents with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == userId;
       }
       match /leaderboard/{docId} {
         allow read: if true;
         allow write: if request.auth != null && request.auth.uid == request.resource.data.uid;
       }
     }
   }
   ```
   This lets anyone *read* profiles and leaderboard entries (needed so a
   future leaderboard page can show everyone's scores, and so avatars/names
   display correctly), but only lets people write to their *own* profile
   or their *own* leaderboard entries — never someone else's.
8. Push to GitHub (or refresh if already deployed) and try signing up.

The Firebase config in `firebase-config.js` is not a secret — it's normal
for it to be visible in client-side code. What actually protects your
data is the Authentication settings and the Firestore rules above.

## How accounts work
- **Email + password**: handled entirely by Firebase Authentication —
  this site never sees or stores your password, only whether Firebase
  says the sign-in succeeded.
- **Google Sign-In**: a normal Firebase/Google popup flow. First sign-in
  creates a matching profile automatically (using the name and photo
  Google shares); later sign-ins just recognize the same account.
- **Sessions**: Firebase Authentication manages this in the browser —
  nothing custom to configure, and it persists across page reloads and
  across the hub and every game page (they all load the same Firebase
  project).
- **Profiles** (display name, bio, avatar) live in Firestore, under
  `users/{uid}`. Avatars are resized client-side to a small JPEG and
  stored as a data URL directly on the profile document — no separate
  file storage bucket needed.
- **High scores** sync automatically: each game checks Firebase's
  sign-in state on load, pulls your saved high score from Firestore, and
  pushes a new one whenever you beat it. Signed in on two devices? Both
  see the same scores.
- **Leaderboard-ready**: every new high score also writes a small entry
  into a separate `leaderboard` collection (`{game}_{uid}` → uid, game,
  displayName, score, updatedAt). No leaderboard page exists yet — this
  is just groundwork so building one later is a matter of querying that
  collection (`gamehub-cloud.js` already has a ready-to-use
  `GameHubCloud.getLeaderboard(game, limit)` function, it's just not
  called by any UI yet), not restructuring the data.

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

## Pong: opponent difficulty
Pong's AI no longer tracks the ball with perfect precision — it "glances"
at the ball periodically rather than continuously, aims with some
imprecision, and drifts back toward center when the ball's headed the
other way, so it reads more like a person than a tracking algorithm.
Separate from the pace picker (Calm/Steady/Swift, which sets overall
speed), a new **Opponent** picker sets how sharp it actually plays:
- **Easy** — noticeably beatable, good for a relaxed match.
- **Normal** — a real but fair challenge.
- **Hard** — sharp and fast; rare mistakes, not zero.

## Cheat codes
Six of the seven games support the classic Konami code —
**↑ ↑ ↓ ↓ ← → ← → B A** — entered any time during play (keyboard only).
A toast confirms it activated. Each game gets an effect that actually
fits it, rather than the same cheat pasted everywhere:

| Game | Effect |
|---|---|
| Breakout | Infinite lives (toggle) |
| Space Invaders | Infinite lives (toggle) |
| Snake | Invincibility — wraps at edges and passes through itself (toggle) |
| Tetris | Clears the board instead of topping out (toggle) |
| Pong | Mega paddle — player paddle grows ~1.8x (toggle) |
| Memory Match | Briefly peeks at every card (one-shot, not a toggle) |

**2048 doesn't get one.** Its whole challenge is managing the board with
only merges — spawning a free high-value tile or similar would just
remove the puzzle rather than add a fun bypass, so it's left alone
instead of bolting on a cheat that undermines the game.

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
4. If you want the new game's high scores to sync too:
   - Copy the Firebase SDK script tags from any existing game's `<head>`
     (`firebase-app-compat.js`, `firebase-auth-compat.js`,
     `firebase-firestore-compat.js`, then `../firebase-config.js` and
     `../gamehub-cloud.js`).
   - Copy the `CloudSync` block from `pong.html` — about 30 lines, just
     change the `GAME_ID` string.
   - Call `CloudSync.pull()` once at startup and `CloudSync.push(score)`
     whenever the score changes (see any existing game for the exact
     spot). There's no separate allow-list to update anywhere — Firestore
     accepts any game id you use consistently.

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