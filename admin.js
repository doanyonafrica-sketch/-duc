// ===== NAVIGATION =====
let allStudents = [];
let allTeachers = [];
let allCourses = [];
let questionCount = 1;

document.querySelectorAll(".nav-item").forEach(item => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const target = item.dataset.section;
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("section-" + target).classList.add("active");

    const titles = {
      students:  ["Gestion des Élèves",      "Créez et gérez les comptes élèves"],
      teachers:  ["Gestion des Professeurs",  "Créez et gérez les comptes professeurs"],
      courses:   ["Gestion des Cours",        "Publiez vos modules de formation"],
      quizzes:   ["Gestion des Quiz",         "Créez des évaluations pour vos élèves"],
      stats:     ["Statistiques",             "Vue d'ensemble de la plateforme"]
    };
    if (titles[target]) {
      document.getElementById("section-title").textContent = titles[target][0];
      document.getElementById("section-sub").textContent   = titles[target][1];
    }
    if (target === "stats") loadStats();
  });
});

// ===== MODAL =====
function openModal(id, userRole) {
  document.getElementById(id).classList.remove("hidden");

  // Adapter le modal d'ajout d'utilisateur selon le rôle
  if (id === "modal-add-user" && userRole) {
    document.getElementById("new-user-role").value = userRole;
    const isTeacher = userRole === "teacher";
    document.getElementById("modal-user-title").textContent = isTeacher ? "Créer un compte professeur" : "Créer un compte élève";

    const badge = document.getElementById("modal-role-badge");
    badge.textContent = isTeacher ? "🎓 Professeur" : "👥 Élève";
    badge.style.cssText = isTeacher
      ? "background:rgba(64,96,240,0.15);color:#6888f8"
      : "background:var(--accent-muted);color:var(--accent)";

    const classLabel = document.getElementById("field-class-label");
    const classInput = document.getElementById("new-class");
    if (isTeacher) {
      classLabel.textContent = "Spécialité / Matière";
      classInput.placeholder = "Ex: Électricité industrielle, Automatisme...";
    } else {
      classLabel.textContent = "Filière / Classe";
      classInput.placeholder = "Ex: Électricité Industrielle — L2";
    }

    // Reset fields
    ["new-fullname","new-email","new-password","new-class"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    document.getElementById("modal-user-error").classList.add("hidden");
  }
}

function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
document.querySelectorAll(".modal-overlay").forEach(m => {
  m.addEventListener("click", (e) => { if (e.target === m) m.classList.add("hidden"); });
});

// ===== LOGOUT =====
async function logout() {
  await window._signOut(window._auth);
  window.location.href = "index.html";
}

// ===== LOAD ALL DATA =====
async function loadAllData() {
  await Promise.all([loadStudents(), loadTeachers(), loadCourses(), loadQuizzes()]);
}

// ===== UNIFIED CREATE USER (élève OU prof) =====
async function createUser() {
  const role     = document.getElementById("new-user-role").value;
  const fullName = document.getElementById("new-fullname").value.trim();
  const email    = document.getElementById("new-email").value.trim();
  const password = document.getElementById("new-password").value.trim();
  const cls      = document.getElementById("new-class").value.trim();
  const errEl    = document.getElementById("modal-user-error");
  const btn      = document.getElementById("create-user-btn");

  errEl.classList.add("hidden");

  if (!fullName || !email || !password) {
    errEl.textContent = "Tous les champs obligatoires doivent être remplis.";
    errEl.classList.remove("hidden");
    return;
  }
  if (password.length < 6) {
    errEl.textContent = "Le mot de passe doit faire au moins 6 caractères.";
    errEl.classList.remove("hidden");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Création...";

  try {
    const cred = await window._createUser(window._auth, email, password);
    await window._setDoc(window._doc(window._db, "users", cred.user.uid), {
      fullName,
      email,
      role,
      // champ adapté selon le rôle
      ...(role === "teacher" ? { specialty: cls } : { class: cls }),
      createdAt: window._serverTimestamp(),
      ...(role === "student" ? { progressPct: 0, progress: { coursesDone: 0, quizzesDone: 0 } } : {})
    });

    closeModal("modal-add-user");

    if (role === "teacher") {
      showAlert("teachers-alert", `✓ Compte professeur créé pour ${fullName}`, "success");
      await loadTeachers();
    } else {
      showAlert("students-alert", `✓ Compte élève créé pour ${fullName}`, "success");
      await loadStudents();
    }
  } catch (e) {
    let msg = "Erreur lors de la création.";
    if (e.code === "auth/email-already-in-use") msg = "Cet email est déjà utilisé.";
    if (e.code === "auth/invalid-email")        msg = "Email invalide.";
    errEl.textContent = msg;
    errEl.classList.remove("hidden");
  }

  btn.disabled = false;
  btn.textContent = "Créer le compte";
}

// ===== STUDENTS =====
async function loadStudents() {
  try {
    const snap = await window._getDocs(window._collection(window._db, "users"));
    allStudents = [];
    snap.forEach(d => { if (d.data().role === "student") allStudents.push({ id: d.id, ...d.data() }); });
    renderStudents(allStudents);
  } catch (e) { console.error(e); }
}

function renderStudents(list) {
  const tbody = document.getElementById("students-tbody");
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Aucun élève inscrit</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(s => `<tr>
    <td><strong>${s.fullName || "—"}</strong></td>
    <td style="color:var(--text-muted);font-size:0.85rem">${s.email || "—"}</td>
    <td><span class="badge">${s.class || "—"}</span></td>
    <td>
      <div class="progress-mini-wrap">
        <div class="progress-mini-track"><div class="progress-mini-fill" style="width:${s.progressPct || 0}%"></div></div>
        <span style="font-size:0.8rem;color:var(--text-muted)">${s.progressPct || 0}%</span>
      </div>
    </td>
    <td>
      <button class="btn-secondary btn-sm" onclick="viewStudent('${s.id}')">Voir</button>
      <button class="btn-secondary btn-sm" style="margin-left:0.3rem" onclick="openGradeModal('${s.id}','${s.fullName}')">📊 Note</button>
      <button class="btn-secondary btn-sm" style="margin-left:0.3rem" onclick="markAttendance('${s.id}','${s.fullName}')">📋 Présence</button>
      <button class="btn-secondary btn-sm" style="margin-left:0.3rem" onclick="linkParent('${s.id}','${s.fullName}')">👨‍👩‍👧 Parent</button>
      <button class="btn-secondary btn-sm" style="margin-left:0.4rem;color:var(--error)" onclick="confirmDelete('${s.id}','${s.fullName}','student')">Suppr.</button>
    </td>
  </tr>`).join("");
}

function filterStudents() {
  const q = document.getElementById("search-students").value.toLowerCase();
  renderStudents(allStudents.filter(s =>
    (s.fullName||"").toLowerCase().includes(q) ||
    (s.email||"").toLowerCase().includes(q) ||
    (s.class||"").toLowerCase().includes(q)
  ));
}

// ===== TEACHERS =====
async function loadTeachers() {
  try {
    const snap = await window._getDocs(window._collection(window._db, "users"));
    allTeachers = [];
    snap.forEach(d => { if (d.data().role === "teacher") allTeachers.push({ id: d.id, ...d.data() }); });
    renderTeachers(allTeachers);
  } catch (e) { console.error(e); }
}

function renderTeachers(list) {
  const tbody = document.getElementById("teachers-tbody");
  if (!tbody) return;
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-loading">Aucun professeur inscrit</td></tr>`;
    return;
  }
  tbody.innerHTML = list.map(t => {
    // Compter les cours publiés par ce prof
    const courseCount = allCourses.filter(c => c.authorId === t.id).length;
    return `<tr>
      <td><strong>${t.fullName || "—"}</strong></td>
      <td style="color:var(--text-muted);font-size:0.85rem">${t.email || "—"}</td>
      <td><span class="badge" style="background:rgba(64,96,240,0.15);color:#6888f8">${t.specialty || "—"}</span></td>
      <td><span class="badge">${courseCount} cours</span></td>
      <td>
        <button class="btn-secondary btn-sm" style="color:var(--error)" onclick="confirmDelete('${t.id}','${t.fullName}','teacher')">Suppr.</button>
      </td>
    </tr>`;
  }).join("");
}

function filterTeachers() {
  const q = document.getElementById("search-teachers").value.toLowerCase();
  renderTeachers(allTeachers.filter(t =>
    (t.fullName||"").toLowerCase().includes(q) ||
    (t.email||"").toLowerCase().includes(q) ||
    (t.specialty||"").toLowerCase().includes(q)
  ));
}

function confirmDelete(uid, name, role) {
  if (confirm(`Supprimer définitivement le compte de ${name} ?`)) {
    const alertId = role === "teacher" ? "teachers-alert" : "students-alert";
    showAlert(alertId, "La suppression Auth nécessite une Cloud Function. Profil Firestore non supprimé.", "info");
  }
}

// ===== COURSES =====
async function loadCourses() {
  try {
    const snap = await window._getDocs(window._collection(window._db, "courses"));
    allCourses = [];
    snap.forEach(d => { if (!d.data().deleted) allCourses.push({ id: d.id, ...d.data() }); });
    renderCoursesAdmin(allCourses);
    populateCourseSelect();
  } catch (e) { console.error(e); }
}

function renderCoursesAdmin(list) {
  const grid = document.getElementById("courses-grid");
  if (!grid) return;
  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">📚 Aucun cours publié. Créez votre premier cours !</div>`;
    return;
  }
  grid.innerHTML = list.map(c => {
    const author = c.authorName || (c.authorRole === "teacher" ? "Professeur" : "Admin");
    return `<div class="course-card">
      <div class="course-card-title">${c.title}</div>
      <div class="course-card-desc">${c.description || ""}</div>
      <div style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.8rem">Par : ${author}</div>
      <div class="course-card-footer">
        <span class="badge">${c.category || "Général"}</span>
        <button class="btn-icon" onclick="deleteCourse('${c.id}')" title="Supprimer">🗑</button>
      </div>
    </div>`;
  }).join("");
}

function filterCourses() {
  const q = document.getElementById("search-courses").value.toLowerCase();
  renderCoursesAdmin(allCourses.filter(c =>
    (c.title||"").toLowerCase().includes(q) ||
    (c.category||"").toLowerCase().includes(q)
  ));
}

async function createCourse() {
  const title   = document.getElementById("new-course-title").value.trim();
  const desc    = document.getElementById("new-course-desc").value.trim();
  const cat     = document.getElementById("new-course-cat").value.trim();
  const content = document.getElementById("new-course-content").value.trim();
  const errEl   = document.getElementById("modal-course-error");

  if (!title || !content) {
    errEl.textContent = "Le titre et le contenu sont obligatoires.";
    errEl.classList.remove("hidden");
    return;
  }
  errEl.classList.add("hidden");

  try {
    await window._addDoc(window._collection(window._db, "courses"), {
      title, description: desc, category: cat || "Général", content,
      authorId:   window._currentUID,
      authorName: window._currentName,
      authorRole: window._currentRole,
      createdAt: window._serverTimestamp()
    });
    closeModal("modal-add-course");
    ["new-course-title","new-course-desc","new-course-cat","new-course-content"]
      .forEach(id => document.getElementById(id).value = "");
    showAlert("courses-alert", "✓ Cours publié avec succès.", "success");
    await loadCourses();
  } catch (e) {
    errEl.textContent = "Erreur lors de la publication.";
    errEl.classList.remove("hidden");
  }
}

async function deleteCourse(id) {
  // Profs ne peuvent supprimer que leurs propres cours
  const course = allCourses.find(c => c.id === id);
  if (window._currentRole === "teacher" && course?.authorId !== window._currentUID) {
    showAlert("courses-alert", "Vous ne pouvez supprimer que vos propres cours.", "error");
    return;
  }
  if (!confirm("Supprimer ce cours ?")) return;
  try {
    await window._setDoc(window._doc(window._db, "courses", id), { deleted: true }, { merge: true });
    showAlert("courses-alert", "Cours supprimé.", "success");
    await loadCourses();
  } catch (e) { showAlert("courses-alert", "Erreur suppression.", "error"); }
}

function populateCourseSelect() {
  const sel = document.getElementById("new-quiz-course");
  if (!sel) return;
  sel.innerHTML = `<option value="">— Choisir un cours —</option>` +
    allCourses.map(c => `<option value="${c.id}">${c.title}</option>`).join("");
}

// ===== QUIZZES =====
async function loadQuizzes() {
  try {
    const snap = await window._getDocs(window._collection(window._db, "quizzes"));
    const tbody = document.getElementById("quizzes-tbody");
    const rows = [];
    snap.forEach(d => {
      const q = d.data();
      if (q.deleted) return;
      const courseTitle = allCourses.find(c => c.id === q.courseId)?.title || "—";
      const author = q.authorName || "—";
      const canDelete = window._currentRole === "admin" || q.authorId === window._currentUID;
      rows.push(`<tr>
        <td><strong>${q.title}</strong></td>
        <td style="color:var(--text-muted)">${courseTitle}</td>
        <td><span class="badge quiz-badge">${(q.questions||[]).length} questions</span></td>
        <td style="font-size:0.83rem;color:var(--text-muted)">${author}</td>
        <td>${canDelete ? `<button class="btn-icon" onclick="deleteQuiz('${d.id}')">🗑</button>` : "—"}</td>
      </tr>`);
    });
    if (tbody) tbody.innerHTML = rows.length ? rows.join("") : `<tr><td colspan="5" class="table-loading">Aucun quiz créé</td></tr>`;
  } catch (e) { console.error(e); }
}

function addQuestion() {
  questionCount++;
  const n = questionCount;
  const block = document.createElement("div");
  block.className = "question-block";
  block.id = `question-${n}`;
  block.innerHTML = `
    <div class="question-header">
      <strong>Question ${n}</strong>
      <button class="btn-icon" onclick="this.closest('.question-block').remove()">✕</button>
    </div>
    <div class="form-group"><input type="text" class="q-text" placeholder="Texte de la question"/></div>
    <div class="options-list">
      ${[0,1,2,3].map(i => `<div class="option-row">
        <input type="radio" name="q${n}-correct" value="${i}"/>
        <input type="text" class="q-option" placeholder="Option ${'ABCD'[i]}"/>
      </div>`).join("")}
    </div>
    <small style="color:var(--text-muted)">● = bonne réponse</small>`;
  document.getElementById("questions-container").appendChild(block);
}

async function createQuiz() {
  const title    = document.getElementById("new-quiz-title").value.trim();
  const courseId = document.getElementById("new-quiz-course").value;
  const errEl    = document.getElementById("modal-quiz-error");
  errEl.classList.add("hidden");

  if (!title) { errEl.textContent = "Le titre est obligatoire."; errEl.classList.remove("hidden"); return; }

  const questions = [];
  document.querySelectorAll(".question-block").forEach(block => {
    const text = block.querySelector(".q-text").value.trim();
    const options = [...block.querySelectorAll(".q-option")].map(i => i.value.trim());
    const correctRadio = block.querySelector(`input[type="radio"]:checked`);
    if (!text || !correctRadio) return;
    questions.push({ text, options, correct: parseInt(correctRadio.value) });
  });

  if (questions.length === 0) { errEl.textContent = "Ajoutez au moins une question complète."; errEl.classList.remove("hidden"); return; }

  try {
    const courseTitle = allCourses.find(c => c.id === courseId)?.title || "";
    await window._addDoc(window._collection(window._db, "quizzes"), {
      title, courseId: courseId || null, courseTitle, questions,
      authorId:   window._currentUID,
      authorName: window._currentName,
      authorRole: window._currentRole,
      createdAt: window._serverTimestamp()
    });
    closeModal("modal-add-quiz");
    document.getElementById("new-quiz-title").value = "";
    document.getElementById("questions-container").innerHTML = `
      <div class="question-block" id="question-1">
        <div class="question-header"><strong>Question 1</strong></div>
        <div class="form-group"><input type="text" class="q-text" placeholder="Texte de la question"/></div>
        <div class="options-list">
          ${[0,1,2,3].map(i => `<div class="option-row"><input type="radio" name="q1-correct" value="${i}"/><input type="text" class="q-option" placeholder="Option ${'ABCD'[i]}"/></div>`).join("")}
        </div>
        <small style="color:var(--text-muted)">● = bonne réponse</small>
      </div>`;
    questionCount = 1;
    showAlert("quizzes-alert", "✓ Quiz publié avec succès.", "success");
    await loadQuizzes();
  } catch (e) {
    errEl.textContent = "Erreur lors de la publication.";
    errEl.classList.remove("hidden");
  }
}

async function deleteQuiz(id) {
  if (!confirm("Supprimer ce quiz ?")) return;
  try {
    await window._setDoc(window._doc(window._db, "quizzes", id), { deleted: true }, { merge: true });
    showAlert("quizzes-alert", "Quiz supprimé.", "success");
    await loadQuizzes();
  } catch (e) { showAlert("quizzes-alert", "Erreur suppression.", "error"); }
}

// ===== VIEW STUDENT =====
async function viewStudent(uid) {
  document.getElementById("student-detail-content").innerHTML = "Chargement...";
  openModal("modal-view-student");
  try {
    const db = window._db;
    const userDoc = await window._getDoc(window._doc(db, "users", uid));
    const data = userDoc.data();

    const resultsSnap = await window._getDocs(
      window._query(window._collection(db, "users", uid, "quizResults"), window._orderBy("completedAt", "desc"))
    );
    const results = [];
    resultsSnap.forEach(d => results.push(d.data()));

    const coursesSnap = await window._getDocs(window._collection(db, "users", uid, "completedCourses"));

    document.getElementById("view-student-name").textContent = data.fullName || "Élève";
    const avgScore = results.length ? Math.round(results.reduce((a,r) => a + r.score, 0) / results.length) : null;

    document.getElementById("student-detail-content").innerHTML = `
      <div class="stats-grid" style="margin-bottom:1.5rem">
        <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-val">${coursesSnap.size}</div><div class="stat-label">Cours vus</div></div>
        <div class="stat-card"><div class="stat-icon">📝</div><div class="stat-val">${results.length}</div><div class="stat-label">Quiz faits</div></div>
        <div class="stat-card"><div class="stat-icon">🏆</div><div class="stat-val">${avgScore !== null ? avgScore+"%" : "—"}</div><div class="stat-label">Score moyen</div></div>
        <div class="stat-card"><div class="stat-icon">🎯</div><div class="stat-val">${data.progressPct || 0}%</div><div class="stat-label">Progression</div></div>
      </div>
      <p style="margin-bottom:0.4rem"><strong>Filière :</strong> ${data.class || "Non renseignée"}</p>
      <p style="margin-bottom:1.2rem"><strong>Email :</strong> ${data.email}</p>
      <h4 style="font-family:'Syne',sans-serif;margin-bottom:0.8rem">Résultats quiz</h4>
      ${results.length === 0 ? '<p style="color:var(--text-muted)">Aucun quiz complété.</p>' :
        `<table class="data-table">
          <thead><tr><th>Quiz</th><th>Score</th><th>Date</th></tr></thead>
          <tbody>${results.map(r => `<tr>
            <td>${r.quizTitle || "—"}</td>
            <td><strong style="color:${r.score>=50?"var(--success)":"var(--error)"}">${r.score}%</strong></td>
            <td style="color:var(--text-muted);font-size:0.83rem">${r.completedAt ? new Date(r.completedAt.seconds*1000).toLocaleDateString("fr-FR") : "—"}</td>
          </tr>`).join("")}</tbody>
        </table>`}`;
  } catch (e) {
    document.getElementById("student-detail-content").innerHTML = `<p style="color:var(--error)">Erreur de chargement.</p>`;
  }
}

// ===== STATS =====
async function loadStats() {
  try {
    const [usersSnap, coursesSnap, quizzesSnap] = await Promise.all([
      window._getDocs(window._collection(window._db, "users")),
      window._getDocs(window._collection(window._db, "courses")),
      window._getDocs(window._collection(window._db, "quizzes"))
    ]);

    let studentCount = 0, teacherCount = 0;
    const topStudents = [];

    usersSnap.forEach(d => {
      const data = d.data();
      if (data.role === "student") { studentCount++; topStudents.push(data); }
      if (data.role === "teacher") teacherCount++;
    });

    document.getElementById("stat-students").textContent = studentCount;
    document.getElementById("stat-teachers").textContent = teacherCount;
    document.getElementById("stat-courses").textContent  = coursesSnap.size;
    document.getElementById("stat-quizzes").textContent  = quizzesSnap.size;

    topStudents.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0));
    const tbody = document.getElementById("top-students-tbody");
    tbody.innerHTML = topStudents.slice(0, 10).map(s => `<tr>
      <td><strong>${s.fullName || "—"}</strong></td>
      <td>${(s.progress||{}).coursesDone || 0}</td>
      <td>${(s.progress||{}).quizzesDone || 0}</td>
      <td style="color:var(--accent)">${s.avgScore ? s.avgScore+"%" : "—"}</td>
    </tr>`).join("") || `<tr><td colspan="4" class="table-loading">Aucune donnée</td></tr>`;
  } catch (e) { console.error(e); }
}

// ===== UTILS =====
function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type}`;
  el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), 4000);
}

// ===== PRESENCES =====
async function markAttendance(studentId, studentName, session) {
  const statuses = ["present", "absent", "late"];
  const labels = { present: "✅ Présent", absent: "❌ Absent", late: "⏰ Retard" };
  const choice = prompt(`Statut pour ${studentName} :\n1. Présent\n2. Absent\n3. Retard\n(tapez 1, 2 ou 3)`);
  if (!choice || !["1","2","3"].includes(choice.trim())) return;
  const status = statuses[parseInt(choice)-1];
  const note = status !== "present" ? (prompt("Note / remarque (facultatif) :") || "") : "";
  await window._addDoc(window._collection(window._db, "attendance"), {
    studentId, studentName, status, session: session || "Séance",
    note, date: window._serverTimestamp(), markedBy: window._currentUID, markedByName: window._currentName
  });
  showAlert("students-alert", `✓ Présence enregistrée : ${studentName} — ${labels[status]}`, "success");
}

// ===== NOTES (prof saisit) =====
async function openGradeModal(studentId, studentName) {
  const subject = prompt(`Matière pour ${studentName} :`);
  if (!subject) return;
  const valueStr = prompt(`Note /20 pour ${subject} (laisser vide si non notée) :`);
  const value = valueStr ? parseFloat(valueStr) : null;
  if (value !== null && (isNaN(value) || value < 0 || value > 20)) { alert("Note invalide (0-20)"); return; }
  const comment = prompt("Appréciation (facultatif) :") || "";
  const db = window._db;
  await window._setDoc(window._doc(db, "users", studentId, "grades", subject.toLowerCase().replace(/\s+/g,"-")), {
    subject, value, comment, updatedAt: window._serverTimestamp(),
    teacherId: window._currentUID, teacherName: window._currentName
  }, { merge: true });
  showAlert("students-alert", `✓ Note enregistrée : ${studentName} — ${subject} : ${value!=null?value+"/20":"—"}`, "success");
}

// ===== LIEN PARENT =====
async function linkParent(studentId, studentName) {
  const parentEmail = prompt(`Email du parent/tuteur de ${studentName} :`);
  if (!parentEmail) return;
  const db = window._db;
  // Chercher le parent par email
  const snap = await window._getDocs(window._query(window._collection(db,"users"), window._where("email","==",parentEmail)));
  if (snap.empty) {
    const create = confirm(`Aucun compte parent trouvé pour ${parentEmail}.\nCréer automatiquement un compte parent ?`);
    if (!create) return;
    const parentPass = prompt("Mot de passe pour le compte parent (min 6 caractères) :");
    if (!parentPass || parentPass.length < 6) return;
    const parentName = prompt("Nom du parent :") || "Parent";
    try {
      const cred = await window._createUser(window._auth, parentEmail, parentPass);
      await window._setDoc(window._doc(db, "users", cred.user.uid), {
        fullName: parentName, email: parentEmail, role: "parent", createdAt: window._serverTimestamp()
      });
      await window._addDoc(window._collection(db, "parentLinks"), {
        parentId: cred.user.uid, parentEmail, parentName, childId: studentId, childName: studentName, createdAt: window._serverTimestamp()
      });
      showAlert("students-alert", `✓ Compte parent créé et lié à ${studentName}.`, "success");
    } catch(e) { showAlert("students-alert", `Erreur : ${e.message}`, "error"); }
  } else {
    const parentDoc = snap.docs[0];
    await window._addDoc(window._collection(db,"parentLinks"), {
      parentId: parentDoc.id, parentEmail, parentName: parentDoc.data().fullName, childId: studentId, childName: studentName, createdAt: window._serverTimestamp()
    });
    showAlert("students-alert", `✓ Parent ${parentDoc.data().fullName} lié à ${studentName}.`, "success");
  }
}
