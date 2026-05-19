# QuizArena — Fullstack Bundle (HTML / CSS / JS)

A standalone, dependency-free version of QuizArena you can open in **VS Code** and run anywhere.

## Files

```
quizarena-static/
├─ index.html      ← landing page
├─ profile.html    ← username + avatar
├─ quiz.html       ← 10-question challenge + results
├─ styles.css      ← all styling (black / yellow / orange)
├─ app.js          ← profile + quiz logic
├─ questions.js    ← 40-question bank
└─ server.js       ← OPTIONAL Node.js backend (/api/profile)
```

## Run options

### 1. Plain (no backend)
Just double-click `index.html`, or in VS Code use the **Live Server** extension → Open with Live Server.
Everything works offline; scores save to `localStorage`.

### 2. With Node.js backend
```bash
node server.js
# open http://localhost:3000
```
This adds a `POST /api/profile` endpoint that appends to `profiles.json`.

## Customize

- **Colors** — edit `:root { --orange / --yellow / ... }` in `styles.css`.
- **Questions** — edit `questions.js` (array of `{ q, options, answer }`).
- **Timing** — change `SECONDS_PER_QUESTION` / `QUESTIONS_PER_SESSION` in `app.js`.

No build step. No dependencies. 100% portable.
