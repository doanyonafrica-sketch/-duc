// ===== STATE =====
let allStudentCourses=[], allStudentExercises=[], allStudentQuizzes=[], allStudentPolls=[];
let currentCourseId=null, currentExerciseId=null, currentQuizId=null;
let selectedFile=null;

// ===== SIDEBAR =====
function openMobileSidebar(){document.querySelector(".sidebar")?.classList.add("open");document.querySelector(".sidebar-overlay")?.classList.add("open");}
function closeMobileSidebar(){document.querySelector(".sidebar")?.classList.remove("open");document.querySelector(".sidebar-overlay")?.classList.remove("open");}
document.querySelector(".sidebar-overlay")?.addEventListener("click",closeMobileSidebar);

// ===== NAV =====
const NAV_TITLES={
  home:["Tableau de bord","Vue d'ensemble de votre activité"],
  courses:["Mes cours","Modules de votre formation"],
  exercises:["Exercices","Travaux dirigés et soumissions"],
  quizzes:["Quiz","Évaluations en ligne"],
  polls:["Sondages","Vos réponses aux sondages"],
  grades:["Mes notes","Bulletin et résultats"],
  attendance:["Mes présences","Historique d'assiduité"],
  progress:["Progression","Avancement dans la formation"],
  leaderboard:["Classement","Positionnement dans le groupe"],
  certificates:["Attestations","Diplômes et certifications"]
};
document.querySelectorAll(".nav-item[data-section]").forEach(item=>{
  item.addEventListener("click",e=>{
    e.preventDefault();
    const t=item.dataset.section;
    document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("section-"+t).classList.add("active");
    if(NAV_TITLES[t]){document.getElementById("section-title").textContent=NAV_TITLES[t][0];document.getElementById("section-sub").textContent=NAV_TITLES[t][1];}
    const loaders={grades:loadGrades,attendance:loadAttendance,progress:loadProgress,leaderboard:loadLeaderboard,certificates:loadCertificates,polls:loadPolls,exercises:loadExercises};
    if(loaders[t]) loaders[t]();
    closeMobileSidebar();
  });
});

function openModal(id){document.getElementById(id)?.classList.remove("hidden");}
function closeModal(id){document.getElementById(id)?.classList.add("hidden");}
document.querySelectorAll(".modal-overlay").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden");}));
async function logout(){await window._signOut(window._auth);window.location.href="index.html";}

// ===== LOAD ALL =====
async function loadStudentData(){
  await Promise.all([loadHome(),loadCourses(),loadQuizzes()]);
  loadExercises();
  loadPolls();
}

// ===== HOME =====
async function loadHome(){
  try{
    const uid=window._currentUser.uid;
    const db=window._db;
    const [actSnap,gradesSnap,quizSnap,subSnap]=await Promise.all([
      window._getDocs(window._query(window._collection(db,"users",uid,"activity"),window._orderBy("createdAt","desc"),window._limit(8))),
      window._getDocs(window._collection(db,"users",uid,"grades")),
      window._getDocs(window._collection(db,"users",uid,"quizResults")),
      window._getDocs(window._query(window._collection(db,"submissions"),window._where("studentId","==",uid)))
    ]);
    const acts=[];actSnap.forEach(d=>acts.push(d.data()));
    const grades=[];gradesSnap.forEach(d=>grades.push(d.data()));
    const quizRes=[];quizSnap.forEach(d=>quizRes.push(d.data()));
    const subs=[];subSnap.forEach(d=>subs.push(d.data()));
    // Stats
    const prog=window._currentUser.progress||{};
    document.getElementById("home-courses-done").textContent=prog.coursesDone||0;
    document.getElementById("home-exo-done").textContent=subs.length;
    if(quizRes.length){
      const best=Math.max(...quizRes.map(r=>r.score||0));
      document.getElementById("home-best-score").textContent=best+"%";
    }
    const gradVals=grades.filter(g=>g.value!=null).map(g=>g.value);
    if(gradVals.length) document.getElementById("home-avg-grade").textContent=(gradVals.reduce((a,b)=>a+b,0)/gradVals.length).toFixed(1)+"/20";
    // Activity
    const el=document.getElementById("recent-activity");
    el.innerHTML=acts.length?acts.map(a=>`<div class="activity-item">
      <div class="activity-dot ${a.type==="quiz"?"quiz":a.type==="exercise"?"":""}"></div>
      <div><div class="activity-text">${a.label}</div>
      <div class="activity-date">${a.createdAt?new Date(a.createdAt.seconds*1000).toLocaleDateString("fr-FR",{day:"numeric",month:"long"}):""}</div></div>
    </div>`).join(""):`<div class="empty-state">Aucune activité récente.</div>`;
  }catch(e){console.error("loadHome",e);}
}

// ===== COURS =====
async function loadCourses(){
  try{
    const uid=window._currentUser.uid;
    const groupId=window._currentUser.groupId||"";
    let snap;
    if(groupId){
      snap=await window._getDocs(window._query(window._collection(window._db,"courses"),window._where("groupId","==",groupId)));
    } else {
      snap=await window._getDocs(window._query(window._collection(window._db,"courses"),window._orderBy("createdAt","desc")));
    }
    allStudentCourses=[];snap.forEach(d=>allStudentCourses.push({id:d.id,...d.data()}));
    // Load done courses
    const doneSnap=await window._getDocs(window._collection(window._db,"users",uid,"doneCourses"));
    const doneIds=new Set();doneSnap.forEach(d=>doneIds.add(d.id));
    renderCourses(allStudentCourses,doneIds);
  }catch(e){console.error("loadCourses",e);}
}
async function filterCoursesStudent(){
  const q=document.getElementById("search-courses-student").value.toLowerCase();
  const uid=window._currentUser.uid;
  const doneSnap=await window._getDocs(window._collection(window._db,"users",uid,"doneCourses"));
  const doneIds=new Set();doneSnap.forEach(d=>doneIds.add(d.id));
  renderCourses(allStudentCourses.filter(c=>c.title.toLowerCase().includes(q)),doneIds);
}
function renderCourses(list,doneIds){
  const g=document.getElementById("student-courses-grid");
  if(!list.length){g.innerHTML='<div class="empty-state">Aucun cours disponible.</div>';return;}
  g.innerHTML=list.map(c=>`<div class="course-card ${doneIds.has(c.id)?"done":""}" onclick="openCourse('${c.id}')">
    <div class="course-card-title">${c.title}</div>
    <div class="course-card-desc">${c.description||"—"}</div>
    <div class="course-card-footer">
      <span class="badge">${c.category||"Cours"}</span>
      ${doneIds.has(c.id)?'<span class="badge badge-done">✓ Vu</span>':'<span class="badge badge-muted">Non vu</span>'}
    </div>
  </div>`).join("");
}
function openCourse(courseId){
  const c=allStudentCourses.find(x=>x.id===courseId);if(!c)return;
  currentCourseId=courseId;
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  document.getElementById("section-course-viewer").classList.add("active");
  document.getElementById("course-viewer-title").textContent=c.title;
  document.getElementById("course-viewer-cat").textContent=c.category||"Cours";
  const content=document.getElementById("course-viewer-content");
  const isYT=c.content&&(c.content.includes("youtube.com")||c.content.includes("youtu.be"));
  if(isYT){
    let videoId="";
    const match=c.content.match(/(?:v=|youtu\.be\/)([^&\n?#]+)/);
    if(match)videoId=match[1];
    content.innerHTML=`<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:var(--radius-sm);margin-bottom:1rem">
      <iframe src="https://www.youtube.com/embed/${videoId}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen></iframe>
    </div>`;
  } else {
    content.textContent=c.content||"Aucun contenu.";
  }
  document.getElementById("mark-done-btn").textContent="✓ Marquer comme vu";
  document.getElementById("section-title").textContent=c.title;
}
function backToCourses(){
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  document.getElementById("section-courses").classList.add("active");
  document.getElementById("section-title").textContent="Mes cours";
  loadCourses();
}
async function markCourseDone(){
  if(!currentCourseId)return;
  const uid=window._currentUser.uid;
  await window._setDoc(window._doc(window._db,"users",uid,"doneCourses",currentCourseId),{doneAt:window._serverTimestamp()});
  await window._addDoc(window._collection(window._db,"users",uid,"activity"),{type:"course",label:"Cours terminé",courseId:currentCourseId,createdAt:window._serverTimestamp()});
  document.getElementById("mark-done-btn").textContent="✓ Déjà vu !";
  // Update progress
  const doneSnap=await window._getDocs(window._collection(window._db,"users",uid,"doneCourses"));
  const total=allStudentCourses.length||1;
  const pct=Math.round((doneSnap.size/total)*100);
  await window._updateDoc(window._doc(window._db,"users",uid),{"progress.coursesDone":doneSnap.size,progressPct:pct});
}

// ===== EXERCICES =====
async function loadExercises(){
  try{
    const uid=window._currentUser.uid;
    const groupId=window._currentUser.groupId||"";
    let snap;
    if(groupId){
      snap=await window._getDocs(window._query(window._collection(window._db,"exercises"),window._where("groupId","==",groupId)));
    } else {
      snap=await window._getDocs(window._query(window._collection(window._db,"exercises"),window._orderBy("createdAt","desc")));
    }
    allStudentExercises=[];snap.forEach(d=>allStudentExercises.push({id:d.id,...d.data()}));
    // Load my submissions
    const subSnap=await window._getDocs(window._query(window._collection(window._db,"submissions"),window._where("studentId","==",uid)));
    const mySubmissions={};subSnap.forEach(d=>{const data=d.data();mySubmissions[data.exerciseId]={...data,id:d.id};});
    renderExercises(allStudentExercises,mySubmissions,"all");
    window._mySubmissions=mySubmissions;
  }catch(e){console.error("loadExercises",e);}
}
function filterExercisesTab(tab,btn){
  document.querySelectorAll(".filter-tab").forEach(b=>b.classList.remove("active"));
  btn.classList.add("active");
  renderExercises(allStudentExercises,window._mySubmissions||{},tab);
}
function renderExercises(list,mySubmissions,tab){
  const g=document.getElementById("student-exercises-grid");
  let filtered=list;
  if(tab==="pending") filtered=list.filter(ex=>!mySubmissions[ex.id]);
  else if(tab==="submitted") filtered=list.filter(ex=>mySubmissions[ex.id]?.status==="submitted");
  else if(tab==="graded") filtered=list.filter(ex=>mySubmissions[ex.id]?.status==="graded");
  if(!filtered.length){g.innerHTML='<div class="empty-state">Aucun exercice dans cette catégorie.</div>';return;}
  g.innerHTML=filtered.map(ex=>{
    const sub=mySubmissions[ex.id];
    const hasDeadline=ex.deadline&&ex.deadline.toDate;
    const deadline=hasDeadline?ex.deadline.toDate():null;
    const expired=deadline&&deadline<new Date();
    let statusHtml,actionHtml;
    if(sub?.status==="graded"){
      statusHtml=`<span class="badge badge-info">✓ Corrigé : ${sub.score}/${sub.maxScore||ex.maxScore}</span>`;
      actionHtml=`<button class="btn-secondary btn-sm" onclick="viewExercise('${ex.id}')">Voir corrigé</button>`;
    } else if(sub){
      statusHtml=`<span class="badge badge-done">📤 Soumis</span>`;
      actionHtml=`<button class="btn-secondary btn-sm" disabled>Soumis</button>`;
    } else if(expired){
      statusHtml=`<span class="deadline-badge deadline-expired">⏰ Délai expiré</span>`;
      actionHtml=`<button class="btn-secondary btn-sm" disabled>Expiré</button>`;
    } else {
      statusHtml=deadline?`<span class="deadline-badge deadline-upcoming">⏰ ${deadline.toLocaleDateString("fr-FR")}</span>`:`<span class="deadline-badge deadline-none">Pas de limite</span>`;
      actionHtml=`<button class="btn-primary btn-sm" onclick="openExercise('${ex.id}')">Faire l'exercice</button>`;
    }
    return `<div class="exo-card ${sub?.status==="graded"?"graded":sub?"submitted":""}">
      <div class="exo-card-title">${ex.title}</div>
      <div class="exo-card-desc">${(ex.description||"").slice(0,100)}${(ex.description||"").length>100?"...":""}</div>
      <div class="exo-card-footer">
        <div style="display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center">
          ${statusHtml}
          <span class="badge ${ex.type==="submission"?"badge-muted":"badge-info"}">${ex.type==="submission"?"📄 PDF":"📝 QCM"}</span>
          <span class="badge">${ex.maxScore||20} pts</span>
        </div>
        ${actionHtml}
      </div>
      ${sub?.status==="graded"&&sub.teacherComment?`<div style="margin-top:0.6rem;padding:0.6rem;background:var(--bg3);border-radius:6px;font-size:0.8rem;color:var(--text-muted);font-style:italic">"${sub.teacherComment}"</div>`:""}
    </div>`;
  }).join("");
}
function openExercise(exerciseId){
  const ex=allStudentExercises.find(e=>e.id===exerciseId);if(!ex)return;
  currentExerciseId=exerciseId;
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  document.getElementById("section-exercise-submit").classList.add("active");
  document.getElementById("exercise-submit-title").textContent=ex.title;
  const deadline=ex.deadline?.toDate?ex.deadline.toDate():null;
  document.getElementById("exercise-submit-meta").textContent=
    `${ex.type==="submission"?"Soumission PDF":"QCM"} · ${ex.maxScore||20} points${deadline?" · Limite : "+deadline.toLocaleDateString("fr-FR"):""}`;
  document.getElementById("exercise-submit-desc").textContent=ex.description||"";
  document.getElementById("section-title").textContent=ex.title;
  // Show right section
  const qcmSec=document.getElementById("exercise-qcm-section");
  const pdfSec=document.getElementById("exercise-pdf-section");
  if(ex.type==="qcm"){
    qcmSec.classList.remove("hidden");pdfSec.classList.add("hidden");
    renderExerciseQCM(ex);
  } else {
    pdfSec.classList.remove("hidden");qcmSec.classList.add("hidden");
    selectedFile=null;
    document.getElementById("submit-pdf-btn").disabled=true;
    document.getElementById("file-chosen-name").classList.add("hidden");
    document.getElementById("upload-progress").classList.add("hidden");
    document.getElementById("exercise-already-submitted").classList.add("hidden");
    document.getElementById("exercise-upload-form").classList.remove("hidden");
  }
}
function viewExercise(exerciseId){
  openExercise(exerciseId);
}
function backToExercises(){
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  document.getElementById("section-exercises").classList.add("active");
  document.getElementById("section-title").textContent="Exercices";
  loadExercises();
}

// QCM exercice
function renderExerciseQCM(ex){
  const c=document.getElementById("exercise-qcm-questions");
  c.innerHTML=(ex.questions||[]).map((q,qi)=>`<div class="quiz-question-block">
    <div class="quiz-q-text">${qi+1}. ${q.question}</div>
    <div class="quiz-options">${q.options.map((opt,oi)=>`<div class="quiz-option" onclick="selectExoOption(this,${qi},${oi})" data-qi="${qi}" data-oi="${oi}">
      <span style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.75rem">${String.fromCharCode(65+oi)}</span>
      ${opt}
    </div>`).join("")}</div>
  </div>`).join("");
  document.getElementById("exercise-qcm-result").classList.add("hidden");
  document.getElementById("submit-exo-qcm-btn").classList.remove("hidden");
  document.getElementById("submit-exo-qcm-btn").disabled=false;
  window._exoAnswers={};
}
function selectExoOption(el,qi,oi){
  document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`).forEach(o=>o.classList.remove("selected"));
  el.classList.add("selected");
  if(!window._exoAnswers)window._exoAnswers={};
  window._exoAnswers[qi]=oi;
}
async function submitExerciseQCM(){
  const ex=allStudentExercises.find(e=>e.id===currentExerciseId);if(!ex)return;
  const answers=window._exoAnswers||{};
  let correct=0;
  (ex.questions||[]).forEach((q,qi)=>{
    const optEls=document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`);
    if(answers[qi]===q.correct){correct++;optEls[q.correct]?.classList.add("correct");}
    else{if(answers[qi]!=null)optEls[answers[qi]]?.classList.add("wrong");optEls[q.correct]?.classList.add("correct");}
    optEls.forEach(o=>{o.style.cursor="default";o.onclick=null;});
  });
  const total=ex.questions.length;
  const score=Math.round((correct/total)*100);
  const pts=Math.round((correct/total)*(ex.maxScore||20)*10)/10;
  document.getElementById("submit-exo-qcm-btn").classList.add("hidden");
  const resultEl=document.getElementById("exercise-qcm-result");
  resultEl.classList.remove("hidden");
  resultEl.innerHTML=`<div class="quiz-result-card">
    <div class="quiz-score-big" style="color:${score>=50?"var(--success)":"var(--error)"}">${score}%</div>
    <div style="margin:0.5rem 0;color:var(--text-muted)">${correct}/${total} correctes · ${pts}/${ex.maxScore||20} points</div>
  </div>`;
  // Save submission
  const uid=window._currentUser.uid;
  await window._addDoc(window._collection(window._db,"submissions"),{
    studentId:uid,studentName:window._currentUser.fullName,
    exerciseId:currentExerciseId,exerciseTitle:ex.title,teacherId:ex.createdBy||"",
    type:"qcm",score:pts,maxScore:ex.maxScore||20,status:"graded",
    submittedAt:window._serverTimestamp(),correctedAt:window._serverTimestamp()
  });
  await window._addDoc(window._collection(window._db,"users",uid,"activity"),{
    type:"exercise",label:`Exercice complété : ${ex.title} (${score}%)`,createdAt:window._serverTimestamp()
  });
  await loadExercises();
}

// PDF upload
function onFileChosen(input){
  const file=input.files[0];if(!file)return;
  selectedFile=file;
  const nameEl=document.getElementById("file-chosen-name");
  nameEl.textContent=`✓ ${file.name}`;
  nameEl.classList.remove("hidden");
  document.getElementById("submit-pdf-btn").disabled=false;
}
async function submitExercisePDF(){
  if(!selectedFile||!currentExerciseId)return;
  const ex=allStudentExercises.find(e=>e.id===currentExerciseId);if(!ex)return;
  // Confirm
  document.getElementById("submit-confirm-info").innerHTML=`<strong>Exercice :</strong> ${ex.title}<br><strong>Fichier :</strong> ${selectedFile.name}`;
  openModal("modal-submit-confirm");
  document.getElementById("confirm-submit-btn").onclick=async()=>{
    closeModal("modal-submit-confirm");
    await doUploadPDF(ex);
  };
}
async function doUploadPDF(ex){
  const uid=window._currentUser.uid;
  const btn=document.getElementById("submit-pdf-btn");
  btn.disabled=true;btn.textContent="Envoi en cours...";
  document.getElementById("upload-progress").classList.remove("hidden");
  const storageRef=window._ref(window._storage,`submissions/${uid}/${currentExerciseId}_${Date.now()}_${selectedFile.name}`);
  const uploadTask=window._uploadBytesResumable(storageRef,selectedFile);
  uploadTask.on("state_changed",
    snap=>{
      const pct=Math.round((snap.bytesTransferred/snap.totalBytes)*100);
      document.getElementById("upload-bar").style.width=pct+"%";
      document.getElementById("upload-pct").textContent=pct+"%";
    },
    err=>{console.error(err);btn.disabled=false;btn.textContent="📤 Soumettre";alert("Erreur upload : "+err.message);},
    async()=>{
      const url=await window._getDownloadURL(uploadTask.snapshot.ref);
      await window._addDoc(window._collection(window._db,"submissions"),{
        studentId:uid,studentName:window._currentUser.fullName,
        exerciseId:currentExerciseId,exerciseTitle:ex.title,teacherId:ex.createdBy||"",
        type:"submission",fileURL:url,fileName:selectedFile.name,
        maxScore:ex.maxScore||20,status:"submitted",submittedAt:window._serverTimestamp()
      });
      await window._addDoc(window._collection(window._db,"users",uid,"activity"),{
        type:"exercise",label:`Exercice soumis : ${ex.title}`,createdAt:window._serverTimestamp()
      });
      document.getElementById("exercise-upload-form").classList.add("hidden");
      document.getElementById("exercise-already-submitted").classList.remove("hidden");
      document.getElementById("exercise-already-submitted").innerHTML=`<div class="alert alert-success">✓ Fichier soumis avec succès ! Votre professeur le corrigera bientôt.</div>`;
      await loadExercises();
    }
  );
}

// ===== QUIZ =====
async function loadQuizzes(){
  try{
    const groupId=window._currentUser.groupId||"";
    let snap;
    if(groupId){
      snap=await window._getDocs(window._query(window._collection(window._db,"quizzes"),window._where("groupId","==",groupId)));
    } else {
      snap=await window._getDocs(window._query(window._collection(window._db,"quizzes"),window._orderBy("createdAt","desc")));
    }
    allStudentQuizzes=[];snap.forEach(d=>allStudentQuizzes.push({id:d.id,...d.data()}));
    const uid=window._currentUser.uid;
    const doneSnap=await window._getDocs(window._collection(window._db,"users",uid,"quizResults"));
    const doneIds={};doneSnap.forEach(d=>{doneIds[d.id]=d.data();});
    renderQuizzes(allStudentQuizzes,doneIds);
  }catch(e){console.error("loadQuizzes",e);}
}
function renderQuizzes(list,doneIds){
  const g=document.getElementById("student-quizzes-grid");
  if(!list.length){g.innerHTML='<div class="empty-state">Aucun quiz disponible.</div>';return;}
  g.innerHTML=list.map(q=>`<div class="course-card ${doneIds[q.id]?"done":""}">
    <div class="course-card-title">${q.title}</div>
    <div class="course-card-desc">${q.courseTitle||""} · ${(q.questions||[]).length} questions</div>
    <div class="course-card-footer">
      <span class="badge badge-info">${(q.questions||[]).length} Qs</span>
      ${doneIds[q.id]?`<span class="badge badge-done">✓ ${doneIds[q.id].score}%</span><button class="btn-secondary btn-sm" onclick="startQuiz('${q.id}')">Refaire</button>`
        :`<button class="btn-primary btn-sm" onclick="startQuiz('${q.id}')">Commencer</button>`}
    </div>
  </div>`).join("");
}
function backToQuizzes(){
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  document.getElementById("section-quizzes").classList.add("active");
  document.getElementById("section-title").textContent="Quiz";
  loadQuizzes();
}
function startQuiz(quizId){
  const q=allStudentQuizzes.find(x=>x.id===quizId);if(!q)return;
  currentQuizId=quizId;
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  document.getElementById("section-quiz-runner").classList.add("active");
  document.getElementById("quiz-runner-title").textContent=q.title;
  document.getElementById("section-title").textContent=q.title;
  const c=document.getElementById("quiz-questions-container");
  window._quizAnswers={};
  c.innerHTML=(q.questions||[]).map((qu,qi)=>`<div class="quiz-question-block">
    <div class="quiz-q-text">${qi+1}. ${qu.question}</div>
    <div class="quiz-options">${qu.options.map((opt,oi)=>`<div class="quiz-option" onclick="selectQuizOption(this,${qi},${oi})" data-qi="${qi}" data-oi="${oi}">
      <span style="width:22px;height:22px;border-radius:50%;border:2px solid var(--border);display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;font-size:0.75rem">${String.fromCharCode(65+oi)}</span>
      ${opt}
    </div>`).join("")}</div>
  </div>`).join("");
  document.getElementById("quiz-result").classList.add("hidden");
  document.getElementById("submit-quiz-btn").classList.remove("hidden");
}
function selectQuizOption(el,qi,oi){
  document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`).forEach(o=>o.classList.remove("selected"));
  el.classList.add("selected");
  if(!window._quizAnswers)window._quizAnswers={};
  window._quizAnswers[qi]=oi;
}
async function submitQuiz(){
  const quiz=allStudentQuizzes.find(q=>q.id===currentQuizId);if(!quiz)return;
  const answers=window._quizAnswers||{};
  let correct=0;
  (quiz.questions||[]).forEach((q,qi)=>{
    const optEls=document.querySelectorAll(`.quiz-option[data-qi="${qi}"]`);
    if(answers[qi]===q.correct){correct++;optEls[q.correct]?.classList.add("correct");}
    else{if(answers[qi]!=null)optEls[answers[qi]]?.classList.add("wrong");optEls[q.correct]?.classList.add("correct");}
    optEls.forEach(o=>{o.style.cursor="default";o.onclick=null;});
  });
  const total=quiz.questions.length;
  const score=Math.round((correct/total)*100);
  document.getElementById("submit-quiz-btn").classList.add("hidden");
  const resultEl=document.getElementById("quiz-result");
  resultEl.classList.remove("hidden");
  resultEl.innerHTML=`<div class="quiz-result-card">
    <div class="quiz-score-big" style="color:${score>=50?"var(--success)":"var(--error)"}">${score}%</div>
    <div style="margin:0.5rem 0;color:var(--text-muted)">${correct}/${total} correctes</div>
  </div>`;
  const uid=window._currentUser.uid;
  await window._setDoc(window._doc(window._db,"users",uid,"quizResults",currentQuizId),{
    quizId:currentQuizId,quizTitle:quiz.title,score,completedAt:window._serverTimestamp()
  });
  await window._addDoc(window._collection(window._db,"users",uid,"activity"),{
    type:"quiz",label:`Quiz terminé : ${quiz.title} (${score}%)`,createdAt:window._serverTimestamp()
  });
  const snap=await window._getDocs(window._collection(window._db,"users",uid,"quizResults"));
  await window._updateDoc(window._doc(window._db,"users",uid),{"progress.quizzesDone":snap.size});
}

// ===== SONDAGES =====
async function loadPolls(){
  try{
    const groupId=window._currentUser.groupId||"";
    let snap;
    if(groupId){
      snap=await window._getDocs(window._query(window._collection(window._db,"polls"),window._where("groupId","==",groupId),window._where("isActive","==",true)));
    } else {
      snap=await window._getDocs(window._query(window._collection(window._db,"polls"),window._where("isActive","==",true)));
    }
    allStudentPolls=[];snap.forEach(d=>allStudentPolls.push({id:d.id,...d.data()}));
    const uid=window._currentUser.uid;
    // Load my votes
    const votesSnap=await window._getDocs(window._collection(window._db,"users",uid,"pollVotes"));
    const myVotes={};votesSnap.forEach(d=>{myVotes[d.data().pollId]=d.data().optionIndex;});
    renderPolls(allStudentPolls,myVotes);
    window._myPollVotes=myVotes;
  }catch(e){console.error("loadPolls",e);}
}
function renderPolls(list,myVotes){
  const g=document.getElementById("student-polls-grid");
  if(!list.length){g.innerHTML='<div class="empty-state">Aucun sondage actif.</div>';return;}
  g.innerHTML=list.map(p=>{
    const voted=myVotes[p.id]!=null;
    const totalVotes=(p.options||[]).reduce((acc,o)=>acc+(o.votes||0),0);
    if(voted){
      return `<div class="poll-card">
        <div class="poll-card-header"><div class="poll-title">${p.title}</div><span class="badge badge-done">✓ Répondu</span></div>
        <div class="poll-meta">${totalVotes} vote(s) au total</div>
        ${(p.options||[]).map((opt,oi)=>{
          const pct=totalVotes?Math.round((opt.votes||0)/totalVotes*100):0;
          return `<div class="poll-result-row">
            <div class="poll-result-label"><span>${opt.text}${oi===myVotes[p.id]?" ✓":""}</span><span>${pct}%</span></div>
            <div class="poll-result-bar-track"><div class="poll-result-bar-fill" style="width:${pct}%;${oi===myVotes[p.id]?"background:var(--accent)":""}"></div></div>
          </div>`;
        }).join("")}
      </div>`;
    } else {
      const now=new Date();
      const closeAt=p.closeAt?.toDate?p.closeAt.toDate():null;
      const expired=closeAt&&closeAt<now;
      return `<div class="poll-card">
        <div class="poll-card-header"><div class="poll-title">${p.title}</div>${expired?'<span class="badge badge-muted">Clôturé</span>':''}</div>
        ${p.description?`<div class="poll-meta">${p.description}</div>`:""}
        ${closeAt?`<div class="poll-timing">Clôture : <span>${closeAt.toLocaleDateString("fr-FR")}</span></div>`:""}
        <div class="poll-options" style="margin-top:0.8rem">
          ${expired?'<div style="color:var(--text-muted);font-size:0.85rem">Ce sondage est clôturé.</div>':
            (p.options||[]).map((opt,oi)=>`<button class="poll-option-btn" onclick="votePoll('${p.id}',${oi})">
              <span style="width:18px;height:18px;border-radius:50%;border:2px solid currentColor;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0"></span>
              ${opt.text}
            </button>`).join("")}
        </div>
      </div>`;
    }
  }).join("");
}
async function votePoll(pollId,optionIndex){
  const uid=window._currentUser.uid;
  const poll=allStudentPolls.find(p=>p.id===pollId);if(!poll)return;
  // Save vote locally to prevent double
  await window._setDoc(window._doc(window._db,"users",uid,"pollVotes",pollId),{pollId,optionIndex,votedAt:window._serverTimestamp()});
  // Update poll option votes
  const updatedOptions=(poll.options||[]).map((opt,oi)=>oi===optionIndex?{...opt,votes:(opt.votes||0)+1}:opt);
  await window._updateDoc(window._doc(window._db,"polls",pollId),{options:updatedOptions});
  // Refresh
  if(!window._myPollVotes)window._myPollVotes={};
  window._myPollVotes[pollId]=optionIndex;
  poll.options=updatedOptions;
  renderPolls(allStudentPolls,window._myPollVotes);
}

// ===== NOTES =====
async function loadGrades(){
  try{
    const uid=window._currentUser.uid;
    const snap=await window._getDocs(window._collection(window._db,"users",uid,"grades"));
    const grades=[];snap.forEach(d=>grades.push({id:d.id,...d.data()}));
    const el=document.getElementById("grades-content");
    if(!grades.length){el.innerHTML='<div class="empty-state">Aucune note disponible.</div>';return;}
    const vals=grades.filter(g=>g.value!=null).map(g=>g.value);
    const avg=vals.length?(vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(1):"—";
    el.innerHTML=`<div class="stats-grid" style="margin-bottom:1.2rem">
      <div class="stat-card"><div class="stat-icon">📊</div><div class="stat-val" style="color:${parseFloat(avg)>=10?"var(--success)":"var(--error)"}">${avg}</div><div class="stat-label">Moyenne /20</div></div>
    </div>
    ${grades.map(g=>{const v=g.value;const cls=v==null?"":v>=14?"grade-good":v>=10?"grade-mid":"grade-bad";
      return `<div class="grades-subject-card"><div class="grades-subject-name">${g.subject||g.id}</div>
        <div class="grade-badge ${cls}">${v!=null?v+"/20":"—"}</div>
        ${g.comment?`<div style="flex:1;font-size:0.82rem;color:var(--text-muted);font-style:italic">"${g.comment}"</div>`:""}</div>`;
    }).join("")}`;
  }catch(e){console.error(e);}
}

// ===== PRESENCES =====
async function loadAttendance(){
  try{
    const uid=window._currentUser.uid;
    const snap=await window._getDocs(window._query(window._collection(window._db,"attendance"),window._where("studentId","==",uid),window._orderBy("createdAt","desc")));
    const records=[];snap.forEach(d=>records.push({id:d.id,...d.data()}));
    let p=0,a=0,l=0;records.forEach(r=>{if(r.status==="present")p++;else if(r.status==="absent")a++;else if(r.status==="late")l++;});
    const tot=p+a+l;
    document.getElementById("att-present").textContent=p;
    document.getElementById("att-absent").textContent=a;
    document.getElementById("att-late").textContent=l;
    document.getElementById("att-rate").textContent=tot?Math.round((p/tot)*100)+"%":"—";
    const tbody=document.getElementById("attendance-tbody");
    const statusLabel={present:"✅ Présent",absent:"❌ Absent",late:"⏰ Retard"};
    const statusColor={present:"var(--success)",absent:"var(--error)",late:"var(--accent)"};
    tbody.innerHTML=records.length?records.map(r=>`<tr>
      <td>${r.date?.toDate?r.date.toDate().toLocaleDateString("fr-FR"):r.createdAt?.toDate?r.createdAt.toDate().toLocaleDateString("fr-FR"):"—"}</td>
      <td>${r.session||"—"}</td>
      <td><span style="color:${statusColor[r.status]||"var(--text-muted)"};font-weight:600">${statusLabel[r.status]||"—"}</span></td>
      <td class="hide-mobile" style="color:var(--text-muted)">${r.note||""}</td>
    </tr>`).join(""):`<tr><td colspan="4" class="table-loading">Aucune donnée.</td></tr>`;
  }catch(e){console.error(e);}
}

// ===== PROGRESSION =====
async function loadProgress(){
  try{
    const uid=window._currentUser.uid;
    const [coursesSnap,doneSnap,quizSnap,subSnap]=await Promise.all([
      window._getDocs(window._collection(window._db,"courses")),
      window._getDocs(window._collection(window._db,"users",uid,"doneCourses")),
      window._getDocs(window._collection(window._db,"users",uid,"quizResults")),
      window._getDocs(window._query(window._collection(window._db,"submissions"),window._where("studentId","==",uid)))
    ]);
    const total=coursesSnap.size;const done=doneSnap.size;
    const pct=total?Math.round((done/total)*100):0;
    document.getElementById("prog-total-courses").textContent=total;
    document.getElementById("prog-done-courses").textContent=done;
    document.getElementById("prog-done-quizzes").textContent=quizSnap.size;
    const subs=[];subSnap.forEach(d=>subs.push({id:d.id,...d.data()}));
    document.getElementById("prog-total-exercises").textContent=subs.length;
    document.getElementById("global-progress-bar").style.width=pct+"%";
    document.getElementById("global-progress-pct").textContent=pct+"%";
    // Exo history
    const exoTbody=document.getElementById("exo-history-tbody");
    const gradedSubs=subs.filter(s=>s.status==="graded");
    exoTbody.innerHTML=gradedSubs.length?gradedSubs.map(s=>`<tr>
      <td><strong>${s.exerciseTitle||"—"}</strong></td>
      <td><span class="badge ${s.type==="submission"?"badge-muted":"badge-info"}">${s.type==="submission"?"PDF":"QCM"}</span></td>
      <td><strong style="color:${(s.score/s.maxScore)>=0.5?"var(--success)":"var(--error)"}">${s.score}/${s.maxScore}</strong></td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${s.correctedAt?.toDate?s.correctedAt.toDate().toLocaleDateString("fr-FR"):"—"}</td>
    </tr>`).join(""):`<tr><td colspan="4" class="table-loading">Aucun exercice noté.</td></tr>`;
    // Quiz history
    const results=[];quizSnap.forEach(d=>results.push(d.data()));
    const tbody=document.getElementById("quiz-history-tbody");
    tbody.innerHTML=results.length?results.map(r=>`<tr>
      <td><strong>${r.quizTitle||"—"}</strong></td>
      <td><strong style="color:${r.score>=50?"var(--success)":"var(--error)"}">${r.score}%</strong></td>
      <td style="font-size:0.78rem;color:var(--text-muted)">${r.completedAt?.toDate?r.completedAt.toDate().toLocaleDateString("fr-FR"):"—"}</td>
    </tr>`).join(""):`<tr><td colspan="3" class="table-loading">Aucun quiz.</td></tr>`;
  }catch(e){console.error(e);}
}

// ===== LEADERBOARD =====
async function loadLeaderboard(){
  try{
    const uid=window._currentUser.uid;
    const groupId=window._currentUser.groupId||"";
    let studentsSnap;
    if(groupId){
      studentsSnap=await window._getDocs(window._query(window._collection(window._db,"users"),window._where("role","==","student"),window._where("groupId","==",groupId)));
    } else {
      studentsSnap=await window._getDocs(window._query(window._collection(window._db,"users"),window._where("role","==","student")));
    }
    const students=[];studentsSnap.forEach(d=>students.push({id:d.id,...d.data()}));
    const data=await Promise.all(students.map(async s=>{
      const snap=await window._getDocs(window._collection(window._db,"users",s.id,"quizResults"));
      const results=[];snap.forEach(d=>results.push(d.data()));
      const avg=results.length?Math.round(results.reduce((acc,r)=>acc+(r.score||0),0)/results.length):0;
      return {id:s.id,name:s.fullName,group:s.class||"—",avg,quizzes:results.length,pct:s.progressPct||0};
    }));
    data.sort((a,b)=>b.avg-a.avg||(b.pct-a.pct));
    const myRank=data.findIndex(d=>d.id===uid)+1;
    const me=data.find(d=>d.id===uid);
    document.getElementById("my-rank-pos").textContent=myRank?"#"+myRank:"—";
    document.getElementById("my-rank-score").textContent="Score moy. : "+(me?me.avg+"%":"—");
    document.getElementById("my-rank-prog").textContent="Progression : "+(me?me.pct+"%":"—");
    const tbody=document.getElementById("leaderboard-tbody");
    tbody.innerHTML=data.map((d,i)=>`<tr class="${d.id===uid?"lb-row-me":""}">
      <td style="text-align:center"><span class="rank-badge ${i===0?"rank-1":i===1?"rank-2":i===2?"rank-3":"rank-other"} ${d.id===uid?"rank-me":""}">${i+1}</span></td>
      <td><strong>${d.name}</strong></td>
      <td class="hide-mobile" style="font-size:0.82rem;color:var(--text-muted)">${d.group}</td>
      <td style="text-align:center;font-family:'Syne',sans-serif;font-weight:700;color:${d.avg>=50?"var(--success)":"var(--error)"}">${d.avg}%</td>
      <td style="text-align:center">
        <div class="progress-mini-wrap" style="justify-content:center">
          <div class="progress-mini-track"><div class="progress-mini-fill" style="width:${d.pct}%"></div></div>
          <span style="font-size:0.75rem;color:var(--text-muted)">${d.pct}%</span>
        </div>
      </td>
    </tr>`).join("");
  }catch(e){console.error(e);}
}

// ===== CERTIFICATS =====
async function loadCertificates(){
  try{
    const uid=window._currentUser.uid;
    const snap=await window._getDocs(window._query(window._collection(window._db,"certificates"),window._where("studentId","==",uid)));
    const certs=[];snap.forEach(d=>certs.push({id:d.id,...d.data()}));
    const el=document.getElementById("certificates-content");
    if(!certs.length){
      el.innerHTML=`<div class="empty-state">🎓 Aucune attestation délivrée pour le moment.<br><small style="color:var(--text-dim)">Vos attestations apparaîtront ici une fois validées par l'administration.</small></div>`;
      return;
    }
    el.innerHTML=certs.map(c=>`<div class="student-cert-card" style="margin-bottom:1rem">
      <div style="font-size:2.5rem;margin-bottom:0.8rem">🏆</div>
      <div class="student-cert-name">${c.studentName||"—"}</div>
      <div class="student-cert-formation">${c.formationTitle||"—"}</div>
      ${c.note?`<div style="font-size:0.9rem;color:var(--text);font-weight:600;margin:0.5rem 0">${c.note}</div>`:""}
      <div class="student-cert-note">Délivrée le ${c.issuedAt?.toDate?c.issuedAt.toDate().toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):"—"} par ${c.issuedByName||"Administration"}</div>
      <button class="cert-print-btn" style="margin-top:1rem" onclick="window.print()">🖨 Imprimer</button>
    </div>`).join("");
  }catch(e){console.error(e);}
}
