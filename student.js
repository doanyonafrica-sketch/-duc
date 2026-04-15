// ===== STATE =====
let allCourses = [], allQuizzes = [];
let currentCourseId = null, currentQuiz = null;
let lbMode = "score", lbData = [];

// ===== NAVIGATION =====
document.querySelectorAll(".nav-item[data-section]").forEach(item => {
  item.addEventListener("click", e => { e.preventDefault(); showSection(item.dataset.section, item); });
});

function showSection(target, navItem) {
  document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  if (navItem) navItem.classList.add("active");
  else document.querySelector(`[data-section="${target}"]`)?.classList.add("active");
  const el = document.getElementById("section-" + target);
  if (el) el.classList.add("active");
  const titles = {
    home:         ["Mon tableau de bord",   "Bienvenue sur votre espace"],
    courses:      ["Mes cours",             "Consultez vos modules de formation"],
    quizzes:      ["Quiz",                  "Testez vos connaissances"],
    grades:       ["Mes notes",             "Consultez vos notes par matière"],
    attendance:   ["Mes présences",         "Historique de ponctualité"],
    progress:     ["Ma progression",        "Suivez votre avancement global"],
    leaderboard:  ["Classement",            "Comparez votre progression"],
    certificates: ["Mes certificats",       "Attestations et diplômes obtenus"],
  };
  if (titles[target]) {
    document.getElementById("section-title").textContent = titles[target][0];
    document.getElementById("section-sub").textContent   = titles[target][1];
  }
  if (target === "progress")     loadProgress();
  if (target === "leaderboard")  loadLeaderboard();
  if (target === "grades")       loadGrades();
  if (target === "attendance")   loadAttendance();
  if (target === "certificates") loadCertificates();
}

async function logout() { await window._signOut(window._auth); window.location.href = "index.html"; }

// ===== MAIN LOAD =====
async function loadStudentData() {
  await Promise.all([loadCourses(), loadQuizzes()]);
  loadHome();
}

// ===== COURSES =====
async function loadCourses() {
  const db = window._db, uid = window._currentUser.uid;
  const [snap, doneSnap] = await Promise.all([
    window._getDocs(window._collection(db, "courses")),
    window._getDocs(window._collection(db, "users", uid, "completedCourses"))
  ]);
  const done = new Set(); doneSnap.forEach(d => done.add(d.id));
  allCourses = [];
  snap.forEach(d => { if (!d.data().deleted) allCourses.push({ id: d.id, ...d.data(), done: done.has(d.id) }); });
  renderCoursesStudent(allCourses);
}

function renderCoursesStudent(list) {
  const grid = document.getElementById("student-courses-grid");
  if (!list.length) { grid.innerHTML = `<div class="empty-state">📚 Aucun cours disponible.</div>`; return; }
  grid.innerHTML = list.map(c => `
    <div class="course-card ${c.done ? "done" : ""}" onclick="openCourse('${c.id}')">
      <div class="course-card-title">${c.title}</div>
      <div class="course-card-desc">${c.description || "Cliquez pour lire ce module."}</div>
      <div class="course-card-footer">
        <span class="badge">${c.category || "Général"}</span>
        ${c.done ? `<span class="badge done-badge">✓ Vu</span>` : `<span style="font-size:0.8rem;color:var(--text-muted)">→ Lire</span>`}
      </div>
    </div>`).join("");
}

function filterCoursesStudent() {
  const q = document.getElementById("search-courses-student").value.toLowerCase();
  renderCoursesStudent(allCourses.filter(c => (c.title||"").toLowerCase().includes(q) || (c.category||"").toLowerCase().includes(q)));
}

function openCourse(id) {
  const c = allCourses.find(x => x.id === id); if (!c) return;
  currentCourseId = id;
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  document.getElementById("section-title").textContent = "Lecture du cours";
  document.getElementById("section-course-viewer").classList.add("active");
  document.getElementById("course-viewer-title").textContent = c.title;
  document.getElementById("course-viewer-cat").textContent = c.category || "Général";
  const ytMatch = (c.content||"").match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (ytMatch) {
    document.getElementById("course-viewer-content").innerHTML = `<iframe width="100%" height="400" src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="border-radius:8px;margin-bottom:1rem"></iframe><p>${c.content.replace(ytMatch[0],"").trim()}</p>`;
  } else {
    document.getElementById("course-viewer-content").textContent = c.content || "";
  }
  const btn = document.getElementById("mark-done-btn");
  btn.disabled = c.done; btn.textContent = c.done ? "✓ Déjà vu" : "✓ Marquer comme vu";
}

function backToCourses() { showSection("courses", null); }

async function markCourseDone() {
  if (!currentCourseId) return;
  const btn = document.getElementById("mark-done-btn");
  btn.disabled = true; btn.textContent = "Enregistrement...";
  const db = window._db, uid = window._currentUser.uid;
  const c = allCourses.find(x => x.id === currentCourseId);
  await window._setDoc(window._doc(db, "users", uid, "completedCourses", currentCourseId), { completedAt: window._serverTimestamp() });
  if (c) c.done = true;
  await window._addDoc(window._collection(db, "users", uid, "activity"), { type: "course", label: `Cours consulté : ${c?.title||""}`, createdAt: window._serverTimestamp() });
  await updateProgress(uid);
  btn.textContent = "✓ Marqué comme vu !";
}

// ===== QUIZZES =====
async function loadQuizzes() {
  const snap = await window._getDocs(window._collection(window._db, "quizzes"));
  allQuizzes = [];
  snap.forEach(d => { if (!d.data().deleted) allQuizzes.push({ id: d.id, ...d.data() }); });
  renderQuizzesStudent(allQuizzes);
}

function renderQuizzesStudent(list) {
  const grid = document.getElementById("student-quizzes-grid");
  if (!list.length) { grid.innerHTML = `<div class="empty-state">📝 Aucun quiz disponible.</div>`; return; }
  grid.innerHTML = list.map(q => `
    <div class="course-card" onclick="openQuiz('${q.id}')">
      <div class="course-card-title">${q.title}</div>
      <div class="course-card-desc">${q.courseTitle ? "Cours : "+q.courseTitle : "Quiz général"}</div>
      <div class="course-card-footer">
        <span class="badge quiz-badge">${(q.questions||[]).length} questions</span>
        <span style="font-size:0.8rem;color:var(--text-muted)">→ Démarrer</span>
      </div>
    </div>`).join("");
}

function openQuiz(id) {
  const quiz = allQuizzes.find(q => q.id === id); if (!quiz) return;
  currentQuiz = { ...quiz, userAnswers: new Array((quiz.questions||[]).length).fill(null) };
  document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
  document.getElementById("section-title").textContent = "Quiz en cours";
  document.getElementById("section-quiz-runner").classList.add("active");
  document.getElementById("quiz-runner-title").textContent = quiz.title;
  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("submit-quiz-btn").classList.remove("hidden");
  document.getElementById("quiz-questions-container").innerHTML = (quiz.questions||[]).map((q, qi) => `
    <div class="quiz-question-block">
      <div class="quiz-q-text">${qi+1}. ${q.text}</div>
      <div class="quiz-options">
        ${(q.options||[]).map((opt, oi) => `
          <label class="quiz-option" id="opt-${qi}-${oi}" onclick="selectAnswer(${qi},${oi})">
            <input type="radio" name="q-${qi}" value="${oi}" style="display:none"/>
            <span style="font-weight:700;color:var(--accent);min-width:20px">${'ABCD'[oi]}.</span>
            <span>${opt}</span>
          </label>`).join("")}
      </div>
    </div>`).join("");
}

function selectAnswer(qi, oi) {
  if (!currentQuiz) return;
  currentQuiz.userAnswers[qi] = oi;
  document.querySelectorAll(`[id^="opt-${qi}-"]`).forEach(el => el.classList.remove("selected"));
  document.getElementById(`opt-${qi}-${oi}`).classList.add("selected");
}

function backToQuizzes() { showSection("quizzes", null); }

async function submitQuiz() {
  if (!currentQuiz) return;
  document.getElementById("submit-quiz-btn").classList.add("hidden");
  const questions = currentQuiz.questions || [];
  let correct = 0;
  questions.forEach((q, qi) => {
    const userAns = currentQuiz.userAnswers[qi];
    document.getElementById(`opt-${qi}-${q.correct}`)?.classList.add("correct");
    if (userAns !== null && userAns !== q.correct) document.getElementById(`opt-${qi}-${userAns}`)?.classList.add("wrong");
    if (userAns === q.correct) correct++;
    document.querySelectorAll(`[id^="opt-${qi}-"]`).forEach(el => el.style.pointerEvents = "none");
  });
  const score = Math.round((correct / questions.length) * 100);
  const emoji = score >= 80 ? "🏆" : score >= 50 ? "👍" : "💪";
  const result = document.getElementById("quiz-result");
  result.classList.remove("hidden");
  result.innerHTML = `<div class="quiz-result-card">
    <div style="font-size:2.5rem;margin-bottom:0.5rem">${emoji}</div>
    <div class="quiz-score-big">${score}%</div>
    <p style="color:var(--text-muted);margin:0.5rem 0">${correct}/${questions.length} bonnes réponses</p>
    <p style="color:${score>=50?"var(--success)":"var(--error)"};font-weight:600">${score>=80?"Excellent !":score>=50?"Bon travail !":"Continuez à travailler !"}</p>
    <button class="btn-secondary" onclick="backToQuizzes()" style="margin-top:1rem">← Retour</button>
  </div>`;
  const db = window._db, uid = window._currentUser.uid;
  await window._addDoc(window._collection(db, "users", uid, "quizResults"), {
    quizId: currentQuiz.id, quizTitle: currentQuiz.title, score, correct, total: questions.length, completedAt: window._serverTimestamp()
  });
  await window._addDoc(window._collection(db, "users", uid, "activity"), {
    type: "quiz", label: `Quiz complété : ${currentQuiz.title} — ${score}%`, createdAt: window._serverTimestamp()
  });
  // Générer certificat si score >= 70 et cours lié
  if (score >= 70 && currentQuiz.courseId) await generateCertificate(currentQuiz);
  await updateProgress(uid);
}

// ===== HOME =====
async function loadHome() {
  const db = window._db, uid = window._currentUser.uid;
  const [resultsSnap, coursesSnap, activitySnap, gradesSnap] = await Promise.all([
    window._getDocs(window._query(window._collection(db, "users", uid, "quizResults"), window._orderBy("completedAt", "desc"))),
    window._getDocs(window._collection(db, "users", uid, "completedCourses")),
    window._getDocs(window._query(window._collection(db, "users", uid, "activity"), window._orderBy("createdAt", "desc"))),
    window._getDocs(window._collection(db, "users", uid, "grades"))
  ]);
  const results = []; resultsSnap.forEach(d => results.push(d.data()));
  document.getElementById("home-courses-done").textContent = coursesSnap.size;
  document.getElementById("home-quizzes-done").textContent = results.length;
  if (results.length) {
    document.getElementById("home-best-score").textContent = Math.max(...results.map(r=>r.score)) + "%";
  }
  // Moyenne des notes
  const grades = []; gradesSnap.forEach(d => grades.push(d.data()));
  if (grades.length) {
    const vals = grades.filter(g => g.value != null).map(g => g.value);
    if (vals.length) document.getElementById("home-avg-grade").textContent = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1) + "/20";
  }
  const acts = []; activitySnap.forEach(d => acts.push(d.data()));
  const actEl = document.getElementById("recent-activity");
  actEl.innerHTML = acts.length ? acts.slice(0,10).map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.type==="quiz"?"quiz":a.type==="msg"?"msg":""}"></div>
      <div>
        <div class="activity-text">${a.label}</div>
        <div class="activity-date">${a.createdAt?new Date(a.createdAt.seconds*1000).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):""}</div>
      </div>
    </div>`).join("") : `<div class="empty-state">Commencez un cours ou un quiz pour voir votre activité.</div>`;
}

// ===== GRADES =====
async function loadGrades() {
  const db = window._db, uid = window._currentUser.uid;
  const snap = await window._getDocs(window._collection(db, "users", uid, "grades"));
  const grades = []; snap.forEach(d => grades.push({ id: d.id, ...d.data() }));
  const el = document.getElementById("grades-content");
  if (!grades.length) {
    el.innerHTML = `<div class="empty-state">📊 Aucune note disponible pour le moment.<br><small style="color:var(--text-dim)">Vos professeurs n'ont pas encore saisi de notes.</small></div>`;
    return;
  }
  const avg = grades.filter(g=>g.value!=null).length
    ? (grades.filter(g=>g.value!=null).reduce((a,g)=>a+g.value,0)/grades.filter(g=>g.value!=null).length).toFixed(1)
    : null;
  el.innerHTML = `
    <div class="stats-grid" style="margin-bottom:2rem">
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-val" style="color:${avg>=10?"var(--success)":"var(--error)"}">${avg||"—"}</div><div class="stat-label">Moyenne générale /20</div></div>
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-val">${grades.length}</div><div class="stat-label">Matières notées</div></div>
      <div class="stat-card"><div class="stat-icon">🏆</div><div class="stat-val">${grades.filter(g=>g.value!=null).length?Math.max(...grades.filter(g=>g.value!=null).map(g=>g.value))+"":""}/20</div><div class="stat-label">Meilleure note</div></div>
    </div>
    <div>
      ${grades.map(g => {
        const v = g.value;
        const cls = v == null ? "" : v >= 14 ? "grade-good" : v >= 10 ? "grade-mid" : "grade-bad";
        return `<div class="grades-subject-card">
          <div class="grades-subject-name">${g.subject || g.id}</div>
          <div class="grade-badge ${cls}">${v != null ? v + "/20" : "—"}</div>
          ${g.comment ? `<div style="flex:1;font-size:0.83rem;color:var(--text-muted);font-style:italic">"${g.comment}"</div>` : ""}
          <div style="font-size:0.78rem;color:var(--text-dim)">${g.updatedAt?new Date(g.updatedAt.seconds*1000).toLocaleDateString("fr-FR"):""}</div>
        </div>`;
      }).join("")}
    </div>
    <div style="margin-top:1.5rem;text-align:right">
      <button class="btn-primary" onclick="downloadBulletin()">⬇ Télécharger le bulletin PDF</button>
    </div>`;
}

function downloadBulletin() {
  const uid = window._currentUser.uid;
  const name = window._currentUser.fullName || "Élève";
  // Génération PDF via impression navigateur stylisée
  const db = window._db;
  window._getDocs(window._collection(db, "users", uid, "grades")).then(snap => {
    const grades = []; snap.forEach(d => grades.push({ id: d.id, ...d.data() }));
    const avg = grades.filter(g=>g.value!=null).length
      ? (grades.filter(g=>g.value!=null).reduce((a,g)=>a+g.value,0)/grades.filter(g=>g.value!=null).length).toFixed(1)
      : "—";
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Bulletin — ${name}</title>
      <style>
        body{font-family:Georgia,serif;padding:40px;max-width:700px;margin:auto;color:#111}
        .school{font-size:22px;font-weight:bold;text-align:center;margin-bottom:4px}
        .subtitle{text-align:center;font-size:13px;color:#555;margin-bottom:30px}
        .divider{border:none;border-top:2px solid #111;margin:20px 0}
        .student-info{margin-bottom:24px}
        table{width:100%;border-collapse:collapse;margin-bottom:24px}
        th{text-align:left;padding:8px 12px;background:#f5f5f5;border:1px solid #ddd;font-size:13px}
        td{padding:8px 12px;border:1px solid #ddd;font-size:13px}
        .avg-row{background:#fffbe6;font-weight:bold}
        .mention{text-align:center;margin-top:20px;font-size:14px;font-style:italic;color:#555}
        .sig{margin-top:60px;display:flex;justify-content:space-between;font-size:12px;color:#777}
        @media print{button{display:none}}
      </style></head><body>
      <div class="school">⚡ EduPro — Bulletin de notes</div>
      <div class="subtitle">Formation professionnelle et technique</div>
      <hr class="divider">
      <div class="student-info">
        <strong>Élève :</strong> ${name}<br>
        <strong>Filière :</strong> ${window._currentUser.class || "—"}<br>
        <strong>Période :</strong> ${new Date().toLocaleDateString("fr-FR",{month:"long",year:"numeric"})}
      </div>
      <table>
        <tr><th>Matière</th><th>Note /20</th><th>Appréciation</th></tr>
        ${grades.map(g=>`<tr><td>${g.subject||g.id}</td><td>${g.value!=null?g.value:"—"}</td><td style="font-style:italic;color:#555">${g.comment||""}</td></tr>`).join("")}
        <tr class="avg-row"><td colspan="1"><strong>Moyenne générale</strong></td><td colspan="2"><strong>${avg}/20</strong></td></tr>
      </table>
      <div class="mention">${parseFloat(avg)>=16?"Très bien":parseFloat(avg)>=14?"Bien":parseFloat(avg)>=12?"Assez bien":parseFloat(avg)>=10?"Passable":"Des efforts sont nécessaires"}</div>
      <div class="sig"><span>Signature du responsable pédagogique :<br><br>________________</span><span style="text-align:right">Fait le ${new Date().toLocaleDateString("fr-FR")}<br>Cachet de l'établissement</span></div>
      <br><button onclick="window.print()">🖨 Imprimer / Enregistrer PDF</button>
    </body></html>`;
    const w = window.open("","_blank");
    w.document.write(html);
    w.document.close();
  });
}

// ===== ATTENDANCE =====
async function loadAttendance() {
  const db = window._db, uid = window._currentUser.uid;
  const snap = await window._getDocs(window._query(window._collection(db, "attendance"), window._where("studentId","==",uid), window._orderBy("date","desc")));
  const records = []; snap.forEach(d => records.push({ id: d.id, ...d.data() }));
  let present=0, absent=0, late=0;
  records.forEach(r => { if(r.status==="present") present++; else if(r.status==="absent") absent++; else if(r.status==="late") late++; });
  const total = present + absent + late;
  const rate = total ? Math.round((present/total)*100) : 0;
  document.getElementById("att-present").textContent = present;
  document.getElementById("att-absent").textContent  = absent;
  document.getElementById("att-late").textContent    = late;
  document.getElementById("att-rate").textContent    = total ? rate+"%" : "—";
  const tbody = document.getElementById("attendance-tbody");
  if (!records.length) { tbody.innerHTML = `<tr><td colspan="4" class="table-loading">Aucune donnée de présence</td></tr>`; return; }
  const statusLabel = { present: "✅ Présent", absent: "❌ Absent", late: "⏰ Retard" };
  const statusColor = { present: "var(--success)", absent: "var(--error)", late: "var(--accent)" };
  tbody.innerHTML = records.map(r => `<tr>
    <td>${r.date ? new Date(r.date.seconds*1000).toLocaleDateString("fr-FR") : "—"}</td>
    <td>${r.session || "—"}</td>
    <td><span style="color:${statusColor[r.status]||"var(--text-muted)"};font-weight:600">${statusLabel[r.status]||"—"}</span></td>
    <td style="color:var(--text-muted);font-size:0.85rem">${r.note||""}</td>
  </tr>`).join("");
}

// ===== PROGRESS =====
async function loadProgress() {
  const db = window._db, uid = window._currentUser.uid;
  const [allCoursesSnap, doneSnap, allQuizzesSnap, resultsSnap] = await Promise.all([
    window._getDocs(window._collection(db, "courses")),
    window._getDocs(window._collection(db, "users", uid, "completedCourses")),
    window._getDocs(window._collection(db, "quizzes")),
    window._getDocs(window._query(window._collection(db, "users", uid, "quizResults"), window._orderBy("completedAt", "desc")))
  ]);
  const results = []; resultsSnap.forEach(d => results.push(d.data()));
  document.getElementById("prog-total-courses").textContent = allCoursesSnap.size;
  document.getElementById("prog-done-courses").textContent  = doneSnap.size;
  document.getElementById("prog-total-quizzes").textContent = allQuizzesSnap.size;
  document.getElementById("prog-done-quizzes").textContent  = results.length;
  const total = allCoursesSnap.size + allQuizzesSnap.size;
  const done  = doneSnap.size + results.length;
  const pct   = total ? Math.round((done/total)*100) : 0;
  document.getElementById("global-progress-bar").style.width = pct+"%";
  document.getElementById("global-progress-pct").textContent = pct+"%";
  const tbody = document.getElementById("quiz-history-tbody");
  tbody.innerHTML = results.length ? results.map(r => `<tr>
    <td><strong>${r.quizTitle||"—"}</strong></td>
    <td><strong style="color:${r.score>=50?"var(--success)":"var(--error)"}">${r.score}%</strong></td>
    <td style="color:var(--text-muted);font-size:0.83rem">${r.completedAt?new Date(r.completedAt.seconds*1000).toLocaleDateString("fr-FR"):"—"}</td>
  </tr>`).join("") : `<tr><td colspan="3" class="table-loading">Aucun quiz complété</td></tr>`;
}

// ===== UPDATE PROGRESS =====
async function updateProgress(uid) {
  const db = window._db;
  const [allCoursesSnap, doneSnap, allQuizzesSnap, resultsSnap] = await Promise.all([
    window._getDocs(window._collection(db, "courses")),
    window._getDocs(window._collection(db, "users", uid, "completedCourses")),
    window._getDocs(window._collection(db, "quizzes")),
    window._getDocs(window._collection(db, "users", uid, "quizResults"))
  ]);
  const results = []; resultsSnap.forEach(d => results.push(d.data()));
  const total = allCoursesSnap.size + allQuizzesSnap.size;
  const done  = doneSnap.size + results.length;
  const pct   = total ? Math.round((done/total)*100) : 0;
  const avg   = results.length ? Math.round(results.reduce((a,r)=>a+r.score,0)/results.length) : null;
  await window._updateDoc(window._doc(db, "users", uid), {
    progressPct: pct, avgScore: avg,
    "progress.coursesDone":  doneSnap.size,
    "progress.quizzesDone":  results.length
  });
}

// ===== LEADERBOARD =====
async function loadLeaderboard() {
  const snap = await window._getDocs(window._collection(window._db, "users"));
  const myUID = window._currentUser.uid;
  lbData = [];
  snap.forEach(d => {
    const data = d.data();
    if (data.role !== "student") return;
    lbData.push({ uid: d.id, fullName: data.fullName||"—", class: data.class||"—", avgScore: data.avgScore||0, progressPct: data.progressPct||0, quizzesDone: (data.progress||{}).quizzesDone||0, isMe: d.id===myUID });
  });
  renderLeaderboard();
}

function switchLeaderboard(mode) {
  lbMode = mode;
  document.querySelectorAll(".lb-tab").forEach(t => t.classList.remove("active"));
  document.getElementById("tab-"+mode).classList.add("active");
  renderLeaderboard();
}

function renderLeaderboard() {
  const sorted = [...lbData].sort((a,b) => lbMode==="score" ? b.avgScore-a.avgScore : b.progressPct-a.progressPct);
  const myIdx  = sorted.findIndex(s => s.isMe);
  const me     = sorted[myIdx];
  if (me) {
    const pos = myIdx+1;
    document.getElementById("my-rank-pos").textContent    = pos===1?"🥇":pos===2?"🥈":pos===3?"🥉":"#"+pos;
    document.getElementById("my-rank-score").textContent  = `Score moy. : ${me.avgScore?me.avgScore+"%":"—"}`;
    document.getElementById("my-rank-prog").textContent   = `Progression : ${me.progressPct}%`;
  }
  const tbody = document.getElementById("leaderboard-tbody");
  if (!sorted.length) { tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Aucune donnée</td></tr>`; return; }
  tbody.innerHTML = sorted.map((s,i) => {
    const rank = i+1;
    const rc = rank===1?"rank-1":rank===2?"rank-2":rank===3?"rank-3":"rank-other";
    const bar = v => `<div class="score-bar-wrap"><div class="score-bar-track"><div class="score-bar-fill" style="width:${v}%"></div></div><span style="font-size:0.82rem;font-weight:700;color:var(--accent)">${v}%</span></div>`;
    return `<tr class="${s.isMe?"lb-row-me":""}">
      <td style="text-align:center"><span class="rank-badge ${rc}${s.isMe?" rank-me":""}">${rank}</span></td>
      <td>${s.isMe?`<strong style="color:var(--accent)">${s.fullName} (Vous)</strong>`:s.fullName}</td>
      <td><span class="badge">${s.class}</span></td>
      <td>${s.avgScore?bar(s.avgScore):"<span style='color:var(--text-muted)'>—</span>"}</td>
      <td>${bar(s.progressPct)}</td>
      <td style="text-align:center;color:var(--text-muted)">${s.quizzesDone}</td>
    </tr>`;
  }).join("");
}

// ===== CERTIFICATS =====
async function loadCertificates() {
  const db = window._db, uid = window._currentUser.uid;
  const snap = await window._getDocs(window._query(window._collection(db, "users", uid, "certificates"), window._orderBy("issuedAt","desc")));
  const certs = []; snap.forEach(d => certs.push({ id: d.id, ...d.data() }));
  const el = document.getElementById("certificates-content");
  if (!certs.length) {
    el.innerHTML = `<div class="empty-state">🎓 Aucun certificat pour l'instant.<br><small style="color:var(--text-dim)">Complétez un quiz avec un score ≥ 70% pour obtenir un certificat.</small></div>`;
    return;
  }
  el.innerHTML = certs.map(c => `
    <div class="certificate-card">
      <div class="certificate-icon">🎓</div>
      <div class="certificate-info">
        <div class="certificate-title">${c.courseTitle || c.quizTitle || "Formation"}</div>
        <div class="certificate-date">${c.issuedAt?new Date(c.issuedAt.seconds*1000).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):""}</div>
      </div>
      <div class="certificate-score">${c.score}%</div>
      <button class="btn-primary btn-sm" onclick="printCertificate('${c.id}')">⬇ PDF</button>
    </div>`).join("");
}

async function generateCertificate(quiz) {
  const db = window._db, uid = window._currentUser.uid;
  const snap = await window._getDocs(window._query(window._collection(db,"users",uid,"certificates"), window._where("quizId","==",quiz.id)));
  if (!snap.empty) return; // déjà généré
  const score = currentQuiz?.userAnswers ? Math.round((currentQuiz.userAnswers.filter((a,i)=>a===quiz.questions[i]?.correct).length/quiz.questions.length)*100) : 0;
  await window._addDoc(window._collection(db,"users",uid,"certificates"), {
    quizId: quiz.id, quizTitle: quiz.title, courseId: quiz.courseId||null,
    courseTitle: quiz.courseTitle||quiz.title, score,
    studentName: window._currentUser.fullName, issuedAt: window._serverTimestamp()
  });
}

async function printCertificate(certId) {
  const db = window._db, uid = window._currentUser.uid;
  const snap = await window._getDoc(window._doc(db,"users",uid,"certificates",certId));
  if (!snap.exists()) return;
  const c = snap.data();
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Certificat</title>
    <style>
      body{font-family:Georgia,serif;background:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
      .cert{border:8px double #f0c040;padding:60px;max-width:700px;text-align:center;position:relative}
      .cert-icon{font-size:60px;margin-bottom:20px}
      .cert-school{font-size:14px;letter-spacing:3px;text-transform:uppercase;color:#888;margin-bottom:10px}
      .cert-title{font-size:32px;font-weight:bold;color:#f0c040;margin-bottom:30px}
      .cert-body{font-size:16px;line-height:1.8;color:#333;margin-bottom:30px}
      .cert-name{font-size:28px;font-weight:bold;color:#111;border-bottom:2px solid #f0c040;display:inline-block;padding-bottom:4px;margin:10px 0}
      .cert-score{font-size:48px;font-weight:bold;color:#3dd68c;margin:20px 0}
      .cert-footer{margin-top:40px;display:flex;justify-content:space-between;font-size:12px;color:#888}
      .seal{width:80px;height:80px;border-radius:50%;border:3px solid #f0c040;display:flex;align-items:center;justify-content:center;font-size:30px;margin:20px auto}
      @media print{button{display:none}}
    </style></head><body>
    <div class="cert">
      <div class="cert-icon">🎓</div>
      <div class="cert-school">EduPro — Formation Professionnelle</div>
      <div class="cert-title">Certificat de réussite</div>
      <div class="cert-body">Ce certificat est décerné à</div>
      <div class="cert-name">${c.studentName}</div>
      <div class="cert-body">pour avoir complété avec succès la formation</div>
      <div style="font-size:20px;font-weight:bold;margin:10px 0">${c.courseTitle}</div>
      <div class="cert-score">${c.score}%</div>
      <div class="seal">⭐</div>
      <div class="cert-footer">
        <span>Émis le ${c.issuedAt?new Date(c.issuedAt.seconds*1000).toLocaleDateString("fr-FR"):new Date().toLocaleDateString("fr-FR")}</span>
        <span>EduPro — edupro.app</span>
      </div>
    </div>
    <br><button onclick="window.print()" style="display:block;margin:20px auto;padding:10px 24px;background:#f0c040;border:none;border-radius:8px;font-weight:bold;cursor:pointer;font-size:16px">🖨 Imprimer / Enregistrer PDF</button>
  </body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close();
}
