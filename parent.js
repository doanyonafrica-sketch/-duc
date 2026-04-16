let currentChildUID = null;
let childrenList = [];

// ===== SIDEBAR MOBILE =====
function openMobileSidebar() {
  document.querySelector(".sidebar")?.classList.add("open");
  document.querySelector(".sidebar-overlay")?.classList.add("open");
}
function closeMobileSidebar() {
  document.querySelector(".sidebar")?.classList.remove("open");
  document.querySelector(".sidebar-overlay")?.classList.remove("open");
}
document.querySelector(".sidebar-overlay")?.addEventListener("click", closeMobileSidebar);
document.querySelector(".hamburger")?.addEventListener("click", openMobileSidebar);

// ===== NAVIGATION =====
document.querySelectorAll(".nav-item[data-section]").forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const t = item.dataset.section;
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("section-"+t).classList.add("active");
    const titles = {
      overview:   ["Vue d'ensemble",  "Suivi global de votre enfant"],
      grades:     ["Notes",           "Bulletin de notes"],
      attendance: ["Présences",       "Historique de présence"],
      progress:   ["Progression",     "Avancement dans les cours"],
      messages:   ["Contact",         "Écrire à l'école"]
    };
    if (titles[t]) { document.getElementById("parent-title").textContent=titles[t][0]; document.getElementById("parent-sub").textContent=titles[t][1]; }
    if (t==="grades"&&currentChildUID) loadChildGrades(currentChildUID);
    if (t==="attendance"&&currentChildUID) loadChildAttendance(currentChildUID);
    if (t==="progress"&&currentChildUID) loadChildProgress(currentChildUID);
    if (t==="messages") { loadContacts(); loadSentMessages(); }
    closeMobileSidebar();
  });
});

async function logout() { await window._signOut(window._auth); window.location.href="index.html"; }

// ===== INIT =====
async function initParentDashboard() {
  const db = window._db, uid = window._currentUser.uid;
  const linksSnap = await window._getDocs(window._query(
    window._collection(db,"parentLinks"),
    window._where("parentId","==",uid)
  ));
  const childUIDs = [];
  linksSnap.forEach(d => childUIDs.push(d.data().childId));
  if (!childUIDs.length) {
    document.getElementById("child-selector").innerHTML = `<div class="empty-state">Aucun enfant lié à votre compte.<br><small style="color:var(--text-dim)">Contactez l'administration.</small></div>`;
    return;
  }
  for (const cuid of childUIDs) {
    const d = await window._getDoc(window._doc(db,"users",cuid));
    if (d.exists()) childrenList.push({ uid: cuid, ...d.data() });
  }
  const sel = document.getElementById("child-selector");
  sel.innerHTML = childrenList.map((c,i) => `<button class="child-btn ${i===0?"active":""}" onclick="selectChild('${c.uid}',this)">${c.fullName}</button>`).join("");
  selectChild(childrenList[0].uid, sel.firstChild);
  loadContacts();
}

function selectChild(uid, btn) {
  document.querySelectorAll(".child-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  currentChildUID = uid;
  const child = childrenList.find(c => c.uid === uid);
  if (child) {
    const header = document.getElementById("child-header");
    header.style.display = "flex";
    document.getElementById("child-av-letter").textContent = child.fullName[0].toUpperCase();
    document.getElementById("child-name-display").textContent = child.fullName;
    document.getElementById("child-class-display").textContent = child.class||"—";
    document.getElementById("child-progress-pct").textContent = (child.progressPct||0)+"%";
    document.getElementById("ov-courses").textContent = (child.progress||{}).coursesDone||0;
    document.getElementById("ov-quizzes").textContent = (child.progress||{}).quizzesDone||0;
    document.getElementById("ov-score").textContent = child.avgScore ? child.avgScore+"%" : "—";
  }
  loadChildOverview(uid);
}

async function loadChildOverview(uid) {
  try {
    const db = window._db;
    const [actSnap, gradesSnap] = await Promise.all([
      window._getDocs(window._query(window._collection(db,"users",uid,"activity"), window._orderBy("createdAt","desc"))),
      window._getDocs(window._collection(db,"users",uid,"grades"))
    ]);
    const acts = []; actSnap.forEach(d => acts.push(d.data()));
    const grades = []; gradesSnap.forEach(d => grades.push(d.data()));
    if (grades.length) {
      const vals = grades.filter(g=>g.value!=null).map(g=>g.value);
      if (vals.length) document.getElementById("ov-grade").textContent = (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1)+"/20";
    }
    const actEl = document.getElementById("parent-activity");
    actEl.innerHTML = acts.length ? acts.slice(0,8).map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.type==="quiz"?"quiz":""}"></div>
        <div>
          <div class="activity-text">${a.label}</div>
          <div class="activity-date">${a.createdAt?new Date(a.createdAt.seconds*1000).toLocaleDateString("fr-FR",{day:"numeric",month:"long"}):""}</div>
        </div>
      </div>`).join("") : `<div class="empty-state">Aucune activité récente.</div>`;
  } catch(e) { console.error(e); }
}

async function loadChildGrades(uid) {
  try {
    const snap = await window._getDocs(window._collection(window._db,"users",uid,"grades"));
    const grades = []; snap.forEach(d => grades.push({ id: d.id, ...d.data() }));
    const el = document.getElementById("parent-grades-content");
    if (!grades.length) { el.innerHTML=`<div class="empty-state">Aucune note disponible.</div>`; return; }
    const avg = grades.filter(g=>g.value!=null).length
      ? (grades.filter(g=>g.value!=null).reduce((a,g)=>a+g.value,0)/grades.filter(g=>g.value!=null).length).toFixed(1) : "—";
    el.innerHTML = `
      <div class="stats-grid" style="margin-bottom:1.2rem">
        <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-val" style="color:${parseFloat(avg)>=10?"var(--success)":"var(--error)"}">${avg}</div><div class="stat-label">Moyenne /20</div></div>
      </div>
      ${grades.map(g => {
        const v=g.value; const cls=v==null?"":v>=14?"grade-good":v>=10?"grade-mid":"grade-bad";
        return `<div class="grades-subject-card"><div class="grades-subject-name">${g.subject||g.id}</div><div class="grade-badge ${cls}">${v!=null?v+"/20":"—"}</div>${g.comment?`<div style="flex:1;font-size:0.82rem;color:var(--text-muted);font-style:italic">"${g.comment}"</div>`:""}</div>`;
      }).join("")}`;
  } catch(e) { console.error(e); }
}

async function loadChildAttendance(uid) {
  try {
    const snap = await window._getDocs(window._query(
      window._collection(window._db,"attendance"),
      window._where("studentId","==",uid),
      window._orderBy("date","desc")
    ));
    const records = []; snap.forEach(d => records.push({ id: d.id, ...d.data() }));
    let p=0,a=0,l=0; records.forEach(r=>{if(r.status==="present")p++;else if(r.status==="absent")a++;else if(r.status==="late")l++;});
    const tot=p+a+l;
    document.getElementById("p-att-present").textContent=p;
    document.getElementById("p-att-absent").textContent=a;
    document.getElementById("p-att-late").textContent=l;
    document.getElementById("p-att-rate").textContent=tot?Math.round((p/tot)*100)+"%":"—";
    const tbody=document.getElementById("parent-att-tbody");
    const statusLabel={present:"✅ Présent",absent:"❌ Absent",late:"⏰ Retard"};
    const statusColor={present:"var(--success)",absent:"var(--error)",late:"var(--accent)"};
    tbody.innerHTML=records.length?records.map(r=>`<tr>
      <td>${r.date?new Date(r.date.seconds*1000).toLocaleDateString("fr-FR"):"—"}</td>
      <td>${r.session||"—"}</td>
      <td><span style="color:${statusColor[r.status]||"var(--text-muted)"};font-weight:600">${statusLabel[r.status]||"—"}</span></td>
      <td class="hide-mobile" style="color:var(--text-muted)">${r.note||""}</td>
    </tr>`).join(""):`<tr><td colspan="4" class="table-loading">Aucune donnée</td></tr>`;
  } catch(e) { console.error(e); }
}

async function loadChildProgress(uid) {
  try {
    const snap = await window._getDocs(window._query(
      window._collection(window._db,"users",uid,"quizResults"),
      window._orderBy("completedAt","desc")
    ));
    const results = []; snap.forEach(d => results.push(d.data()));
    const child = childrenList.find(c => c.uid===uid);
    const pct = child?.progressPct||0;
    document.getElementById("p-prog-bar").style.width = pct+"%";
    document.getElementById("p-prog-pct").textContent = pct+"%";
    const tbody = document.getElementById("parent-quiz-tbody");
    tbody.innerHTML = results.length ? results.map(r=>`<tr>
      <td><strong>${r.quizTitle||"—"}</strong></td>
      <td><strong style="color:${r.score>=50?"var(--success)":"var(--error)"}">${r.score}%</strong></td>
      <td style="color:var(--text-muted);font-size:0.82rem">${r.completedAt?new Date(r.completedAt.seconds*1000).toLocaleDateString("fr-FR"):"—"}</td>
    </tr>`).join("") : `<tr><td colspan="3" class="table-loading">Aucun quiz</td></tr>`;
  } catch(e) { console.error(e); }
}

async function loadContacts() {
  try {
    const snap = await window._getDocs(window._collection(window._db,"users"));
    const opts = [];
    snap.forEach(d => { const data=d.data(); if(data.role==="admin"||data.role==="teacher") opts.push({uid:d.id,name:data.fullName,role:data.role}); });
    const sel = document.getElementById("parent-msg-to");
    sel.innerHTML = `<option value="">— Choisir —</option>` +
      opts.map(o=>`<option value="${o.uid}">${o.name} (${o.role==="admin"?"Admin":"Prof"})</option>`).join("");
  } catch(e) { console.error(e); }
}

async function sendParentMessage() {
  const to=document.getElementById("parent-msg-to").value;
  const subject=document.getElementById("parent-msg-subject").value.trim();
  const body=document.getElementById("parent-msg-body").value.trim();
  const alert=document.getElementById("parent-msg-alert");
  if (!to||!body) { alert.textContent="Veuillez remplir tous les champs."; alert.className="alert alert-error"; alert.classList.remove("hidden"); return; }
  await window._addDoc(window._collection(window._db,"parentMessages"),{
    fromId:window._currentUser.uid, fromName:window._currentUser.fullName,
    toId:to, subject, body,
    childName: childrenList.find(c=>c.uid===currentChildUID)?.fullName||"",
    sentAt:window._serverTimestamp(), read:false
  });
  document.getElementById("parent-msg-subject").value="";
  document.getElementById("parent-msg-body").value="";
  alert.textContent="✓ Message envoyé avec succès.";
  alert.className="alert alert-success";
  alert.classList.remove("hidden");
  setTimeout(()=>alert.classList.add("hidden"),3000);
  loadSentMessages();
}

async function loadSentMessages() {
  try {
    const snap = await window._getDocs(window._query(
      window._collection(window._db,"parentMessages"),
      window._where("fromId","==",window._currentUser.uid),
      window._orderBy("sentAt","desc")
    ));
    const msgs = []; snap.forEach(d => msgs.push(d.data()));
    const el = document.getElementById("parent-sent-msgs");
    if (!msgs.length) { el.innerHTML=`<div class="empty-state">Aucun message envoyé.</div>`; return; }
    el.innerHTML = msgs.map(m=>`<div class="announce-card">
      <div class="announce-title">${m.subject||"(sans objet)"}</div>
      <div class="announce-body">${m.body}</div>
      <div class="announce-meta">Envoyé le ${m.sentAt?new Date(m.sentAt.seconds*1000).toLocaleDateString("fr-FR"):""} · Concernant : ${m.childName||"—"}</div>
    </div>`).join("");
  } catch(e) { console.error(e); }
}