/* QuizArena — vanilla JS app */
(function () {
  const AVATARS = ["🦊", "🐙", "🦄", "🐲", "🦅", "🐼", "🦁", "🐸"];
  const QUESTIONS_PER_SESSION = 15;
  const SECONDS_PER_QUESTION = 15;
  const SCORES_KEY = "quizArenaScores";
  const PROFILES_KEY = "qa_profiles";

  const QA = {};

  function getProfiles() {
    try {
      return JSON.parse(localStorage.getItem(PROFILES_KEY) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveProfile(name, avatar) {
    if (!name) return;
    const profiles = getProfiles();
    if (!profiles.some((p) => p.name === name && p.avatar === avatar)) {
      profiles.push({ name, avatar });
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    }
  }

  function setCurrentProfile(name, avatar) {
    localStorage.setItem("qa_username", name);
    localStorage.setItem("qa_avatar", avatar);
    saveProfile(name, avatar);
  }

  function computeProfileStats(name) {
    const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
    const items = all.filter((entry) => entry.name === name);
    const total = items.length;
    if (!total) return { total: 0, avg: 0, best: 0 };
    const avg = Math.round(items.reduce((sum, item) => sum + item.pct, 0) / total);
    const best = Math.max.apply(null, items.map((item) => item.pct));
    return { total, avg, best };
  }

  function updateProfileReviewHeader(profile) {
    const avatar = document.getElementById("resultProfileAvatar");
    const nameEl = document.getElementById("resultProfileName");
    const detail = document.getElementById("resultProfileDetail");
    if (!avatar || !nameEl || !detail) return;
    avatar.textContent = profile.avatar || "🙂";
    nameEl.textContent = profile.name;
    detail.textContent = "Review this profile's quiz history below.";
  }

  function updateProfileStats(name) {
    const stats = computeProfileStats(name);
    const quizzes = document.getElementById("profileQuizzes");
    const avg = document.getElementById("profileAvg");
    const best = document.getElementById("profileBest");
    if (!quizzes || !avg || !best) return;
    quizzes.textContent = `${stats.total} quiz${stats.total === 1 ? "" : "zes"} taken`;
    avg.textContent = `Avg ${stats.avg}%`;
    best.textContent = `Best ${stats.best}%`;
  }

  // ---------- shared landing analytics ----------
  function loadStats() {
    const el = document.getElementById("stats");
    if (!el) return;
    try {
      const raw = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      if (!raw.length) return;
      const avg = Math.round(raw.reduce((s, e) => s + e.pct, 0) / raw.length);
      const best = Math.max.apply(null, raw.map((e) => e.pct));
      el.querySelector('[data-stat="taken"]').textContent = raw.length;
      el.querySelector('[data-stat="avg"]').textContent = avg + "%";
      el.querySelector('[data-stat="best"]').textContent = best + "%";
    } catch (e) { /* keep defaults */ }
  }

  // ---------- profile page ----------
  QA.initProfile = function () {
    const grid = document.getElementById("avatarGrid");
    const input = document.getElementById("username");
    const form = document.getElementById("profileForm");
    const submit = document.getElementById("submitBtn");
    const storedAvatar = localStorage.getItem("qa_avatar") || AVATARS[0];
    const storedName = localStorage.getItem("qa_username") || "";
    let chosen = storedAvatar;

    AVATARS.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = a;
      if (a === chosen) b.classList.add("active");
      b.onclick = () => {
        chosen = a;
        grid.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x.textContent === a));
      };
      grid.appendChild(b);
    });

    input.value = storedName;

    form.onsubmit = async (e) => {
      e.preventDefault();
      const username = input.value.trim();
      if (!username) return;
      submit.disabled = true; submit.textContent = "Entering…";
      setCurrentProfile(username, chosen);
      // Optional backend (works only if you also run server.js)
      try {
        await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, avatar: chosen }),
        });
      } catch (_) { /* offline: localStorage is the source of truth */ }
      window.location.href = "quiz.html";
    };
  };

  // ---------- quiz page ----------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  let state = null;

  QA.initQuiz = function () {
    const bank = window.QUESTION_BANK || [];
    const player = localStorage.getItem("qa_username") || "Player";
    const avatar = localStorage.getItem("qa_avatar") || "";
    state = {
      player, avatar,
      picks: shuffle(bank).slice(0, QUESTIONS_PER_SESSION),
      index: 0, score: 0, selected: null,
      answers: [], msLeft: SECONDS_PER_QUESTION * 1000,
      tickRef: null, endAt: 0, locked: false,
    };
    saveProfile(player, avatar);
    document.getElementById("qPlayer").textContent = (avatar ? avatar + " " : "") + player;
    renderQuestion();
    document.getElementById("skipBtn").onclick = () => commit(null, false);
  };

  QA.restart = function () { QA.initQuiz(); };

  function renderQuestion() {
    const s = state;
    const q = s.picks[s.index];
    document.getElementById("qText").textContent = q.q;
    document.getElementById("qProgress").textContent = `Q ${s.index + 1} / ${s.picks.length}`;
    document.getElementById("progressBar").style.width = ((s.index) / s.picks.length * 100) + "%";

    const opts = document.getElementById("qOptions");
    opts.innerHTML = "";
    const letters = ["A", "B", "C", "D"];
    const items = letters.map((k) => ({ key: k, label: k, text: q.options[k] }));
    const shuffledItems = shuffle(items);
    shuffledItems.forEach((item, idx) => {
      const label = letters[idx];
      const btn = document.createElement("button");
      btn.className = "option";
      btn.dataset.answer = item.key;
      btn.innerHTML = `<span class="key">${label}.</span><span>${item.text}</span>`;
      btn.onclick = () => commit(label, true, item.key);
      opts.appendChild(btn);
    });

    document.getElementById("resultsScreen").classList.add("hidden");
    document.getElementById("quizScreen").classList.remove("hidden");

    s.msLeft = SECONDS_PER_QUESTION * 1000;
    s.endAt = Date.now() + s.msLeft;
    s.locked = false;
    if (s.tickRef) clearInterval(s.tickRef);
    s.tickRef = setInterval(tick, 100);
    tick();
  }

  function tick() {
    const s = state; const left = Math.max(0, s.endAt - Date.now());
    const timer = document.getElementById("qTimer");
    const sec = Math.ceil(left / 1000);
    timer.textContent = sec + "s";
    timer.classList.toggle("warn", sec <= 5);
    if (left <= 0) commit(null, false);
  }

  function commit(letter, _wasPick, originalKey) {
    const s = state; if (s.locked) return;
    s.locked = true;
    clearInterval(s.tickRef);
    const q = s.picks[s.index];
    const correct = originalKey === q.answer;
    s.answers.push({ q, picked: letter, pickedKey: originalKey, correct, timedOut: !letter });
    if (correct) s.score++;
    // visual feedback
    document.querySelectorAll(".option").forEach((b) => {
      const optionKey = b.dataset.answer;
      if (optionKey === q.answer) b.classList.add("correct");
      if (letter && optionKey === originalKey && originalKey !== q.answer) b.classList.add("wrong");
      b.disabled = true;
    });
    setTimeout(() => {
      s.index++;
      if (s.index >= s.picks.length) showResults();
      else renderQuestion();
    }, 700);
  }

  function showResults() {
    const s = state;
    const correct = s.answers.filter((a) => a.correct).length;
    const wrong = s.answers.filter((a) => !a.correct && !a.timedOut).length;
    const skipped = s.answers.filter((a) => a.timedOut).length;
    const total = s.picks.length;
    const pct = Math.round((correct / total) * 100);
    const grade = pct >= 90 ? "S" : pct >= 75 ? "A" : pct >= 60 ? "B" : pct >= 45 ? "C" : pct >= 30 ? "D" : "F";
    const verdict = pct >= 90 ? "Flawless." : pct >= 75 ? "Excellent." : pct >= 60 ? "Solid run." : pct >= 45 ? "Keep going." : "Try again.";

    document.getElementById("quizScreen").classList.add("hidden");
    const r = document.getElementById("resultsScreen"); r.classList.remove("hidden");
    document.getElementById("verdict").textContent = verdict;
    document.getElementById("finalLine").textContent = `${s.player} · ${correct}/${total} correct`;
    document.getElementById("ringGrade").textContent = grade;
    document.getElementById("ringPct").textContent = pct + "%";
    const ring = document.getElementById("ringFill");
    const C = 2 * Math.PI * 80;
    ring.style.strokeDasharray = C;
    ring.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.2,.7,.2,1)";
    requestAnimationFrame(() => { ring.style.strokeDashoffset = C * (1 - pct / 100); });

    document.getElementById("tCorrect").textContent = correct;
    document.getElementById("tWrong").textContent = wrong;
    document.getElementById("tSkipped").textContent = skipped;
    document.getElementById("accCorrect").style.flex = correct;
    document.getElementById("accWrong").style.flex = wrong;
    document.getElementById("accSkip").style.flex = skipped;

    const list = document.getElementById("reviewList"); list.innerHTML = "";
    s.answers.forEach((a, i) => {
      const li = document.createElement("li");
      const icon = a.correct ? "✓" : a.timedOut ? "⏱" : "✗";
      li.innerHTML = `<b>${icon} Q${i + 1}.</b> ${a.q.q} <br/><span class="muted">Answer: ${a.q.answer} · ${a.q.options[a.q.answer]}</span>`;
      list.appendChild(li);
    });

    updateProfileReviewHeader({ name: s.player, avatar: s.avatar });
    updateProfileStats(s.player);

    // persist
    try {
      const all = JSON.parse(localStorage.getItem(SCORES_KEY) || "[]");
      all.push({ name: s.player, score: correct, total, pct, date: Date.now() });
      localStorage.setItem(SCORES_KEY, JSON.stringify(all));
    } catch (_) {}
  }

  // expose + boot
  window.QA = QA;
  document.addEventListener("DOMContentLoaded", loadStats);
})();
