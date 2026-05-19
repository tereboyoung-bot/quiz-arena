/**
 * QuizArena — optional Node.js backend
 *
 * Run this only if you want the /api/profile endpoint to persist usernames
 * to a local profiles.json file. The frontend works fully offline without it
 * (localStorage is the source of truth).
 *
 * Usage:
 *   node server.js
 *   open http://localhost:3000
 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const STORE = path.join(ROOT, "profiles.json");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function loadProfiles() {
  try { return JSON.parse(fs.readFileSync(STORE, "utf8")); } catch { return []; }
}
function saveProfiles(list) { fs.writeFileSync(STORE, JSON.stringify(list, null, 2)); }

const server = http.createServer(async (req, res) => {
  // API: POST /api/profile  { username, avatar? }
  if (req.method === "POST" && req.url === "/api/profile") {
    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const username = String(body.username || "").trim().slice(0, 20);
      if (!username) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "username required" }));
      }
      const list = loadProfiles();
      list.push({ username, avatar: body.avatar || "", createdAt: Date.now() });
      saveProfiles(list);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, username }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: String(e) }));
    }
  }

  // Static file serving
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const filePath = path.join(ROOT, urlPath);
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("forbidden"); }

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("not found"); }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`QuizArena → http://localhost:${PORT}`));
