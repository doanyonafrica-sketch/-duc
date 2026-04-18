// ===== STATE =====
let allStudents=[], allTeachers=[], allCourses=[], allQuizzesList=[];
let allFormations=[], allGroups=[], allExercises=[], allPolls=[], allSubmissions=[], allCerts=[];
let questionCount=1, exerciseQCount=1;

// ===== SIDEBAR & NAV =====
function openMobileSidebar(){document.querySelector(".sidebar")?.classList.add("open");document.querySelector(".sidebar-overlay")?.classList.add("open");}
function closeMobileSidebar(){document.querySelector(".sidebar")?.classList.remove("open");document.querySelector(".sidebar-overlay")?.classList.remove("open");}
document.querySelector(".sidebar-overlay")?.addEventListener("click",closeMobileSidebar);

const TITLES={
  formations:["Formations","Gérez vos formations et programmes"],
  classes:["Classes","Modules liés aux formations"],
  groups:["Groupes","Groupes d'élèves avec formation et professeur"],
  students:["Gestion des Élèves","Comptes et affectation aux groupes"],
  teachers:["Gestion des Professeurs","Comptes professeurs"],
  parents:["Gestion des Parents","Comptes parents et liens élèves"],
  mygroups:["Mes groupes","Classes qui vous sont attribuées"],
  attendance:["Présences","Saisie et historique des présences"],
  tracking:["Suivi élèves","Progression de vos élèves"],
  courses:["Cours","Modules de formation"],
  exercises:["Exercices","Travaux dirigés et soumissions"],
  submissions:["Soumissions","Travaux soumis par les élèves"],
  polls:["Sondages","Questions et retours des élèves"],
  quizzes:["Quiz","Évaluations en ligne"],
  certificates:["Attestations","Délivrance manuelle de diplômes"],
  stats:["Statistiques","Vue d'ensemble de la plateforme"]
};
document.querySelectorAll(".nav-item[data-section]").forEach(item=>{
  item.addEventListener("click",e=>{
    e.preventDefault();
    const t=item.dataset.section;
    document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("section-"+t).classList.add("active");
    if(TITLES[t]){document.getElementById("section-title").textContent=TITLES[t][0];document.getElementById("section-sub").textContent=TITLES[t][1];}
    const loaders={stats:loadStats,submissions:loadSubmissions,polls:loadPolls,exercises:loadExercises,certificates:loadCertificates,mygroups:loadMyGroups,tracking:loadTrackingGroups,attendance:loadAttGroups};
    if(loaders[t]) loaders[t]();
    closeMobileSidebar();
  });
});

// ===== MODAL =====
function openModal(id,userRole){
  document.getElementById(id).classList.remove("hidden");
  if(id==="modal-add-user"&&userRole){
    document.getElementById("new-user-role").value=userRole;
    const isT=userRole==="teacher",isP=userRole==="parent";
    document.getElementById("modal-user-title").textContent=isT?"Créer un compte professeur":isP?"Créer un compte parent":"Créer un compte élève";
    const badge=document.getElementById("modal-role-badge");
    badge.textContent=isT?"🎓 Professeur":isP?"👨‍👩‍👧 Parent":"👤 Élève";
    badge.style.cssText=isT?"background:rgba(64,96,240,0.15);color:#6888f8":isP?"background:rgba(61,214,140,0.12);color:var(--success)":"background:var(--accent-muted);color:var(--accent)";
    const classLabel=document.getElementById("field-class-label");
    const classInput=document.getElementById("new-class");
    document.getElementById("field-group-wrap").style.display=(userRole==="student")?"block":"none";
    if(isT){classLabel.textContent="Spécialité / Matière";classInput.placeholder="Ex: Électricité industrielle";}
    else if(isP){classLabel.textContent="Remarque (optionnel)";classInput.placeholder="Ex: Parent de Kofi Mensah";}
    else{classLabel.textContent="Filière / Classe";classInput.placeholder="Ex: Électricité Industrielle — L2";}
    ["new-fullname","new-email","new-password","new-class"].forEach(f=>{const e=document.getElementById(f);if(e)e.value="";});
    document.getElementById("modal-user-error").classList.add("hidden");
    if(userRole==="student") populateGroupSelect("new-student-group");
  }
  if(id==="modal-add-group"){populateFormationSelect("new-group-formation");populateTeacherSelect("new-group-teacher");populateStudentCheckboxes();}
  if(id==="modal-add-course"){populateGroupSelect("new-course-group");}
  if(id==="modal-add-exercise"){populateGroupSelect("new-exercise-group");}
  if(id==="modal-add-quiz"){populateGroupSelect("new-quiz-group");populateCourseSelect("new-quiz-course");}
  if(id==="modal-add-cert"){populateStudentSelect("cert-student");populateFormationSelect("cert-formation");}
  if(id==="modal-link-parent"){populateParentSelect("link-parent-select");populateStudentSelect("link-student-select");}
  if(id==="modal-add-class"){populateFormationSelect("new-class-formation");}
  if(id==="modal-add-poll"){populateGroupSelect("new-poll-group");}
}
function closeModal(id){document.getElementById(id).classList.add("hidden");}
document.querySelectorAll(".modal-overlay").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden");}));

function openModalAddClass(){
  openModal("modal-add-class");
  const f=document.getElementById("class-formation-filter")?.value;
  if(f&&document.getElementById("new-class-formation")){
    setTimeout(()=>{document.getElementById("new-class-formation").value=f;},100);
  }
}

async function logout(){await window._signOut(window._auth);window.location.href="index.html";}

// ===== POPULATE HELPERS =====
function populateSelect(selId,items,valFn,labelFn,placeholder="— Choisir —"){
  const sel=document.getElementById(selId);if(!sel)return;
  sel.innerHTML=`<option value="">${placeholder}</option>`+items.map(i=>`<option value="${valFn(i)}">${labelFn(i)}</option>`).join("");
}
function populateFormationSelect(id){populateSelect(id,allFormations,f=>f.id,f=>f.title);}
function populateTeacherSelect(id){populateSelect(id,allTeachers,t=>t.id,t=>t.fullName);}
function populateGroupSelect(id){populateSelect(id,allGroups,g=>g.id,g=>g.name,"— Tous les groupes —");}
function populateCourseSelect(id){populateSelect(id,allCourses,c=>c.id,c=>c.title);}
function populateStudentSelect(id){populateSelect(id,allStudents,s=>s.id,s=>s.fullName);}
function populateParentSelect(id){
  const snap=allStudents; // reuse global to find parents
  window._getDocs(window._collection(window._db,"users")).then(snap2=>{
    const parents=[];snap2.forEach(d=>{if(d.data().role==="parent")parents.push({id:d.id,...d.data()});});
    populateSelect(id,parents,p=>p.id,p=>p.fullName);
  });
}
function populateStudentCheckboxes(){
  const c=document.getElementById("group-students-list");if(!c)return;
  if(!allStudents.length){c.innerHTML='<div style="padding:0.5rem;color:var(--text-muted);font-size:0.85rem">Aucun élève.</div>';return;}
  c.innerHTML=allStudents.map(s=>`<label style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0.4rem;cursor:pointer;border-radius:6px;transition:background 0.15s" onmouseover="this.style.background='var(--bg2)'" onmouseout="this.style.background=''">
    <input type="checkbox" class="group-student-cb" value="${s.id}" style="accent-color:var(--accent);width:16px;height:16px"/>
    <span style="font-size:0.88rem">${s.fullName}</span>
    <span style="font-size:0.75rem;color:var(--text-dim)">${s.class||""}</span>
  </label>`).join("");
}

// ===== LOAD ALL =====
async function loadAllData(){
  await Promise.all([loadStudents(),loadTeachers(),loadFormations(),loadGroups(),loadCourses(),loadQuizzes()]);
}

// ===== FORMATIONS =====
async function loadFormations(){
  const snap=await window._getDocs(window._query(window._collection(window._db,"formations"),window._orderBy("createdAt","desc")));
  allFormations=[];snap.forEach(d=>allFormations.push({id:d.id,...d.data()}));
  renderFormations(allFormations);
  // Populate class-formation-filter dropdown
  const sel=document.getElementById("class-formation-filter");
  if(sel){sel.innerHTML='<option value="">— Sélectionner —</option>'+allFormations.map(f=>`<option value="${f.id}">${f.title}</option>`).join("");}
}
function renderFormations(list){
  const g=document.getElementById("formations-grid");
  if(!list.length){g.innerHTML='<div class="empty-state">Aucune formation. Créez votre première formation !</div>';return;}
  g.innerHTML=list.map(f=>`<div class="formation-card">
    <div class="formation-card-header">
      <div>
        <div class="formation-title">${f.title}</div>
        <div class="formation-meta">${f.category||""} ${f.duration?"· "+f.duration:""}</div>
      </div>
      <span class="badge">${f.category||"Formation"}</span>
    </div>
    <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:1rem;line-height:1.6">${f.description||"Aucune description."}</div>
    <div class="formation-actions">
      <button class="btn-info btn-sm" onclick="viewFormationClasses('${f.id}','${f.title.replace(/'/g,"\\'")}')">📂 Classes</button>
      <button class="btn-danger btn-sm" onclick="deleteFormation('${f.id}')">🗑</button>
    </div>
  </div>`).join("");
}
function filterFormations(){const q=document.getElementById("search-formations").value.toLowerCase();renderFormations(allFormations.filter(f=>f.title.toLowerCase().includes(q)));}
function viewFormationClasses(id,title){
  // Switch to classes section and filter
  document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  const nav=document.querySelector('[data-section="classes"]');if(nav)nav.classList.add("active");
  document.getElementById("section-classes").classList.add("active");
  document.getElementById("section-title").textContent="Classes";
  document.getElementById("section-sub").textContent="Modules de : "+title;
  document.getElementById("class-formation-filter").value=id;
  loadClassesForFormation(id);
}
async function createFormation(){
  const title=document.getElementById("new-formation-title").value.trim();
  const desc=document.getElementById("new-formation-desc").value.trim();
  const cat=document.getElementById("new-formation-cat").value.trim();
  const dur=document.getElementById("new-formation-duration").value.trim();
  const errEl=document.getElementById("modal-formation-error");
  errEl.classList.add("hidden");
  if(!title){errEl.textContent="Le titre est obligatoire.";errEl.classList.remove("hidden");return;}
  await window._addDoc(window._collection(window._db,"formations"),{title,description:desc,category:cat,duration:dur,createdBy:window._currentUID,createdAt:window._serverTimestamp()});
  closeModal("modal-add-formation");
  ["new-formation-title","new-formation-desc","new-formation-cat","new-formation-duration"].forEach(id=>{document.getElementById(id).value="";});
  await loadFormations();
  showAlert("formations-alert","Formation créée avec succès.","success");
}
async function deleteFormation(id){
  if(!confirm("Supprimer cette formation ? Les classes liées seront aussi supprimées."))return;
  await window._deleteDoc(window._doc(window._db,"formations",id));
  await loadFormations();
}

// ===== CLASSES =====
async function loadClassesForFormation(formationId){
  if(!formationId){document.getElementById("classes-list").innerHTML='<div class="empty-state">Sélectionnez une formation.</div>';return;}
  const snap=await window._getDocs(window._query(window._collection(window._db,"formations",formationId,"classes"),window._orderBy("order","asc")));
  const classes=[];snap.forEach(d=>classes.push({id:d.id,...d.data(),formationId}));
  renderClasses(classes,formationId);
}
function renderClasses(classes,formationId){
  const el=document.getElementById("classes-list");
  if(!classes.length){el.innerHTML='<div class="empty-state">Aucune classe pour cette formation.</div>';return;}
  el.innerHTML=`<div class="class-list">${classes.map(c=>`<div class="class-item">
    <span class="class-item-order">${c.order}</span>
    <div style="flex:1"><div class="class-item-title">${c.title}</div>${c.description?`<div style="font-size:0.78rem;color:var(--text-muted)">${c.description}</div>`:""}</div>
    <button class="btn-danger btn-sm" onclick="deleteClass('${formationId}','${c.id}')">🗑</button>
  </div>`).join("")}</div>`;
}
async function createClass(){
  const formationId=document.getElementById("new-class-formation").value;
  const title=document.getElementById("new-class-title").value.trim();
  const order=parseInt(document.getElementById("new-class-order").value)||1;
  const desc=document.getElementById("new-class-desc").value.trim();
  const errEl=document.getElementById("modal-class-error");errEl.classList.add("hidden");
  if(!formationId||!title){errEl.textContent="Formation et titre obligatoires.";errEl.classList.remove("hidden");return;}
  await window._addDoc(window._collection(window._db,"formations",formationId,"classes"),{title,order,description:desc,formationId,createdAt:window._serverTimestamp()});
  closeModal("modal-add-class");
  ["new-class-title","new-class-desc"].forEach(id=>{document.getElementById(id).value="";});
  await loadClassesForFormation(formationId);
}
async function deleteClass(formationId,classId){
  if(!confirm("Supprimer cette classe ?"))return;
  await window._deleteDoc(window._doc(window._db,"formations",formationId,"classes",classId));
  await loadClassesForFormation(formationId);
}

// ===== GROUPES =====
async function loadGroups(){
  let q;
  if(window._currentRole==="teacher"){
    q=window._query(window._collection(window._db,"groups"),window._where("teacherId","==",window._currentUID));
  } else {
    q=window._query(window._collection(window._db,"groups"),window._orderBy("createdAt","desc"));
  }
  const snap=await window._getDocs(q);
  allGroups=[];snap.forEach(d=>allGroups.push({id:d.id,...d.data()}));
  renderGroups(allGroups);
}
function renderGroups(list){
  const g=document.getElementById("groups-grid");if(!g)return;
  if(!list.length){g.innerHTML='<div class="empty-state">Aucun groupe.</div>';return;}
  g.innerHTML=list.map(gr=>`<div class="group-card">
    <div class="group-card-header">
      <div class="group-name">${gr.name}</div>
      <span class="badge badge-info">${(gr.studentIds||[]).length} élèves</span>
    </div>
    <div class="group-meta">
      Formation : <span>${allFormations.find(f=>f.id===gr.formationId)?.title||gr.formationId||"—"}</span><br>
      Prof : <span>${gr.teacherName||"—"}</span>
    </div>
    <div class="group-members-preview">${(gr.studentIds||[]).slice(0,5).map(uid=>{
      const s=allStudents.find(st=>st.id===uid);
      return s?`<span class="group-member-chip">${s.fullName.split(" ")[0]}</span>`:"";
    }).join("")}${(gr.studentIds||[]).length>5?`<span class="group-member-chip">+${(gr.studentIds||[]).length-5}</span>`:""}</div>
    <div class="formation-actions">
      <button class="btn-info btn-sm" onclick="viewGroup('${gr.id}')">👁 Détail</button>
      ${window._currentRole==="admin"?`<button class="btn-danger btn-sm" onclick="deleteGroup('${gr.id}')">🗑</button>`:""}
    </div>
  </div>`).join("");
}
function filterGroups(){const q=document.getElementById("search-groups").value.toLowerCase();renderGroups(allGroups.filter(g=>g.name.toLowerCase().includes(q)));}
async function createGroup(){
  const name=document.getElementById("new-group-name").value.trim();
  const formationId=document.getElementById("new-group-formation").value;
  const teacherId=document.getElementById("new-group-teacher").value;
  const errEl=document.getElementById("modal-group-error");errEl.classList.add("hidden");
  if(!name||!formationId||!teacherId){errEl.textContent="Nom, formation et professeur obligatoires.";errEl.classList.remove("hidden");return;}
  const studentIds=[...document.querySelectorAll(".group-student-cb:checked")].map(cb=>cb.value);
  const teacher=allTeachers.find(t=>t.id===teacherId);
  const formation=allFormations.find(f=>f.id===formationId);
  const groupRef=await window._addDoc(window._collection(window._db,"groups"),{
    name,formationId,formationTitle:formation?.title||"",teacherId,teacherName:teacher?.fullName||"",
    studentIds,createdAt:window._serverTimestamp(),createdBy:window._currentUID
  });
  // Update each student's groupId
  for(const uid of studentIds){
    await window._updateDoc(window._doc(window._db,"users",uid),{groupId:groupRef.id,formationId});
  }
  closeModal("modal-add-group");document.getElementById("new-group-name").value="";
  await loadGroups();
  showAlert("groups-alert","Groupe créé avec succès.","success");
}
async function deleteGroup(id){
  if(!confirm("Supprimer ce groupe ?"))return;
  await window._deleteDoc(window._doc(window._db,"groups",id));
  await loadGroups();
}
async function viewGroup(groupId){
  const gr=allGroups.find(g=>g.id===groupId);if(!gr)return;
  document.getElementById("view-group-name").textContent=gr.name;
  const content=document.getElementById("view-group-content");
  content.innerHTML="<div class='table-loading'>Chargement...</div>";
  openModal("modal-view-group");
  const formation=allFormations.find(f=>f.id===gr.formationId);
  const students=allStudents.filter(s=>(gr.studentIds||[]).includes(s.id));
  content.innerHTML=`<div style="margin-bottom:1rem;padding:0.8rem;background:var(--bg3);border-radius:var(--radius-sm);font-size:0.85rem">
    <strong>Formation :</strong> ${formation?.title||"—"}<br>
    <strong>Professeur :</strong> ${gr.teacherName||"—"}<br>
    <strong>Élèves :</strong> ${(gr.studentIds||[]).length}
  </div>
  <h4 style="font-family:'Syne',sans-serif;margin-bottom:0.8rem">Élèves du groupe</h4>
  <div>${students.length?students.map(s=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:0.6rem 0;border-bottom:1px solid var(--border)">
    <span>${s.fullName}</span>
    <span style="font-size:0.78rem;color:var(--text-muted)">${s.class||"—"}</span>
  </div>`).join(""):'<div class="empty-state">Aucun élève.</div>'}</div>`;
}

// ===== ÉLÈVES =====
async function loadStudents(){
  const snap=await window._getDocs(window._query(window._collection(window._db,"users"),window._where("role","==","student")));
  allStudents=[];snap.forEach(d=>allStudents.push({id:d.id,...d.data()}));
  renderStudents(allStudents);
}
function renderStudents(list){
  const tbody=document.getElementById("students-tbody");if(!tbody)return;
  if(!list.length){tbody.innerHTML='<tr><td colspan="5" class="table-loading">Aucun élève.</td></tr>';return;}
  tbody.innerHTML=list.map(s=>{
    const gr=allGroups.find(g=>(g.studentIds||[]).includes(s.id));
    return `<tr>
      <td><strong>${s.fullName}</strong></td>
      <td class="hide-mobile" style="color:var(--text-muted);font-size:0.82rem">${s.email}</td>
      <td>${gr?`<span class="badge badge-info">${gr.name}</span>`:`<span class="badge badge-muted">Sans groupe</span>`}</td>
      <td class="hide-mobile" style="font-size:0.82rem;color:var(--text-muted)">${s.class||"—"}</td>
      <td><div class="table-actions"><button class="btn-danger btn-sm" onclick="deleteUser('${s.id}')">🗑</button></div></td>
    </tr>`;
  }).join("");
}
function filterStudents(){const q=document.getElementById("search-students").value.toLowerCase();renderStudents(allStudents.filter(s=>s.fullName.toLowerCase().includes(q)||(s.email||"").toLowerCase().includes(q)));}

// ===== PROFESSEURS =====
async function loadTeachers(){
  const snap=await window._getDocs(window._query(window._collection(window._db,"users"),window._where("role","==","teacher")));
  allTeachers=[];snap.forEach(d=>allTeachers.push({id:d.id,...d.data()}));
  renderTeachers(allTeachers);
}
function renderTeachers(list){
  const tbody=document.getElementById("teachers-tbody");if(!tbody)return;
  if(!list.length){tbody.innerHTML='<tr><td colspan="5" class="table-loading">Aucun professeur.</td></tr>';return;}
  tbody.innerHTML=list.map(t=>{
    const groups=allGroups.filter(g=>g.teacherId===t.id);
    return `<tr>
      <td><strong>${t.fullName}</strong></td>
      <td class="hide-mobile" style="color:var(--text-muted);font-size:0.82rem">${t.email}</td>
      <td><span class="badge badge-info">${t.specialty||"—"}</span></td>
      <td class="hide-mobile" style="font-size:0.82rem;color:var(--text-muted)">${groups.length} groupe(s)</td>
      <td><div class="table-actions"><button class="btn-danger btn-sm" onclick="deleteUser('${t.id}')">🗑</button></div></td>
    </tr>`;
  }).join("");
}
function filterTeachers(){const q=document.getElementById("search-teachers").value.toLowerCase();renderTeachers(allTeachers.filter(t=>t.fullName.toLowerCase().includes(q)));}

// ===== PARENTS =====
async function loadParents(){
  const snap=await window._getDocs(window._query(window._collection(window._db,"users"),window._where("role","==","parent")));
  const parents=[];snap.forEach(d=>parents.push({id:d.id,...d.data()}));
  const linksSnap=await window._getDocs(window._collection(window._db,"parentLinks"));
  const links=[];linksSnap.forEach(d=>links.push({id:d.id,...d.data()}));
  renderParents(parents,links);
}
function renderParents(parents,links){
  const tbody=document.getElementById("parents-tbody");if(!tbody)return;
  if(!parents.length){tbody.innerHTML='<tr><td colspan="4" class="table-loading">Aucun parent.</td></tr>';return;}
  tbody.innerHTML=parents.map(p=>{
    const pLinks=links.filter(l=>l.parentId===p.id);
    const childNames=pLinks.map(l=>{const s=allStudents.find(st=>st.id===l.childId);return s?s.fullName:"?";}).join(", ");
    return `<tr>
      <td><strong>${p.fullName}</strong></td>
      <td class="hide-mobile" style="color:var(--text-muted);font-size:0.82rem">${p.email}</td>
      <td style="font-size:0.82rem">${childNames||'<span style="color:var(--text-dim)">Aucun lien</span>'}</td>
      <td><div class="table-actions">
        <button class="btn-danger btn-sm" onclick="deleteUser('${p.id}')">🗑</button>
      </div></td>
    </tr>`;
  }).join("");
}

// ===== CREATE USER =====
async function createUser(){
  const role=document.getElementById("new-user-role").value;
  const fullName=document.getElementById("new-fullname").value.trim();
  const email=document.getElementById("new-email").value.trim();
  const password=document.getElementById("new-password").value.trim();
  const cls=document.getElementById("new-class").value.trim();
  const groupId=role==="student"?document.getElementById("new-student-group")?.value:"";
  const errEl=document.getElementById("modal-user-error");
  const btn=document.getElementById("create-user-btn");
  errEl.classList.add("hidden");
  if(!fullName||!email||!password){errEl.textContent="Tous les champs sont obligatoires.";errEl.classList.remove("hidden");return;}
  if(password.length<6){errEl.textContent="Le mot de passe doit faire au moins 6 caractères.";errEl.classList.remove("hidden");return;}
  btn.disabled=true;btn.textContent="Création...";
  try{
    const cred=await window._createUser(window._secondaryAuth,email,password);
    await window._secondaryAuth.signOut();
    const userData={fullName,email,role,createdAt:window._serverTimestamp()};
    if(role==="student"){Object.assign(userData,{class:cls,groupId:groupId||"",progressPct:0,progress:{coursesDone:0,quizzesDone:0}});}
    else if(role==="teacher"){Object.assign(userData,{specialty:cls});}
    else if(role==="parent"){Object.assign(userData,{note:cls});}
    await window._setDoc(window._doc(window._db,"users",cred.user.uid),userData);
    if(groupId&&role==="student"){
      const gr=allGroups.find(g=>g.id===groupId);
      if(gr){
        const newIds=[...(gr.studentIds||[]),cred.user.uid];
        await window._updateDoc(window._doc(window._db,"groups",groupId),{studentIds:newIds});
      }
    }
    closeModal("modal-add-user");
    await loadStudents();await loadTeachers();await loadGroups();
    showAlert(role==="student"?"students-alert":role==="teacher"?"teachers-alert":"parents-alert","Compte créé avec succès.","success");
  }catch(err){
    errEl.textContent=err.code==="auth/email-already-in-use"?"Cet email est déjà utilisé.":"Erreur : "+err.message;
    errEl.classList.remove("hidden");
  }
  btn.disabled=false;btn.textContent="Créer le compte";
}
async function deleteUser(uid){
  if(!confirm("Supprimer ce compte ?"))return;
  await window._deleteDoc(window._doc(window._db,"users",uid));
  await loadStudents();await loadTeachers();await loadParents();await loadGroups();
}

// ===== PARENT LINK =====
async function createParentLink(){
  const parentId=document.getElementById("link-parent-select").value;
  const childId=document.getElementById("link-student-select").value;
  const errEl=document.getElementById("modal-link-error");errEl.classList.add("hidden");
  if(!parentId||!childId){errEl.textContent="Veuillez choisir parent et élève.";errEl.classList.remove("hidden");return;}
  await window._addDoc(window._collection(window._db,"parentLinks"),{parentId,childId,addedAt:window._serverTimestamp(),addedBy:window._currentUID});
  closeModal("modal-link-parent");
  await loadParents();
  showAlert("parents-alert","Lien parent-élève créé.","success");
}

// ===== COURS =====
async function loadCourses(){
  let q=window._currentRole==="teacher"
    ?window._query(window._collection(window._db,"courses"),window._where("createdBy","==",window._currentUID),window._orderBy("createdAt","desc"))
    :window._query(window._collection(window._db,"courses"),window._orderBy("createdAt","desc"));
  const snap=await window._getDocs(q);
  allCourses=[];snap.forEach(d=>allCourses.push({id:d.id,...d.data()}));
  renderCourses(allCourses);
}
function renderCourses(list){
  const g=document.getElementById("courses-grid");if(!g)return;
  if(!list.length){g.innerHTML='<div class="empty-state">Aucun cours.</div>';return;}
  g.innerHTML=list.map(c=>`<div class="course-card">
    <div class="course-card-title">${c.title}</div>
    <div class="course-card-desc">${c.description||"—"}</div>
    <div class="course-card-footer">
      <span class="badge">${c.category||"Cours"}</span>
      <div class="table-actions">
        <button class="btn-danger btn-sm" onclick="deleteCourse('${c.id}')">🗑</button>
      </div>
    </div>
  </div>`).join("");
}
function filterCourses(){const q=document.getElementById("search-courses").value.toLowerCase();renderCourses(allCourses.filter(c=>c.title.toLowerCase().includes(q)));}
async function createCourse(){
  const title=document.getElementById("new-course-title").value.trim();
  const desc=document.getElementById("new-course-desc").value.trim();
  const cat=document.getElementById("new-course-cat").value.trim();
  const groupId=document.getElementById("new-course-group").value;
  const content=document.getElementById("new-course-content").value.trim();
  const errEl=document.getElementById("modal-course-error");errEl.classList.add("hidden");
  if(!title){errEl.textContent="Le titre est obligatoire.";errEl.classList.remove("hidden");return;}
  await window._addDoc(window._collection(window._db,"courses"),{title,description:desc,category:cat,content,groupId:groupId||"",createdBy:window._currentUID,createdByName:window._currentName,createdAt:window._serverTimestamp()});
  closeModal("modal-add-course");
  ["new-course-title","new-course-desc","new-course-cat","new-course-content"].forEach(id=>{document.getElementById(id).value="";});
  await loadCourses();
}
async function deleteCourse(id){if(!confirm("Supprimer ce cours ?"))return;await window._deleteDoc(window._doc(window._db,"courses",id));await loadCourses();}

// ===== EXERCICES =====
let exerciseQCount2=1;
async function loadExercises(){
  let q=window._currentRole==="teacher"
    ?window._query(window._collection(window._db,"exercises"),window._where("createdBy","==",window._currentUID),window._orderBy("createdAt","desc"))
    :window._query(window._collection(window._db,"exercises"),window._orderBy("createdAt","desc"));
  const snap=await window._getDocs(q);
  allExercises=[];snap.forEach(d=>allExercises.push({id:d.id,...d.data()}));
  renderExercises(allExercises);
  populateSubmissionFilter();
}
function renderExercises(list){
  const g=document.getElementById("exercises-grid");if(!g)return;
  if(!list.length){g.innerHTML='<div class="empty-state">Aucun exercice.</div>';return;}
  g.innerHTML=list.map(ex=>{
    const gr=allGroups.find(g=>g.id===ex.groupId);
    const hasDeadline=ex.deadline;
    let deadlineHtml="";
    if(hasDeadline){
      const d=ex.deadline.toDate?ex.deadline.toDate():new Date(ex.deadline);
      const expired=d<new Date();
      deadlineHtml=`<span class="deadline-badge ${expired?"deadline-expired":"deadline-upcoming"}">⏰ ${d.toLocaleDateString("fr-FR")}</span>`;
    }else{deadlineHtml=`<span class="deadline-badge deadline-none">Pas de limite</span>`;}
    return `<div class="exercise-card">
      <div class="exercise-card-header">
        <div>
          <div class="exercise-title">${ex.title}</div>
          <div class="exercise-meta">${gr?gr.name:"Tous"} · <span class="${ex.type==="submission"?"exercise-type-submission":"exercise-type-qcm"}">${ex.type==="submission"?"📤 Soumission PDF":"📝 QCM"}</span></div>
        </div>
        <span class="badge">${ex.maxScore||20} pts</span>
      </div>
      <div style="font-size:0.82rem;color:var(--text-muted);margin-bottom:0.8rem;line-height:1.5">${ex.description||"—"}</div>
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
        ${deadlineHtml}
        <div class="table-actions">
          <button class="btn-info btn-sm" onclick="viewExerciseSubs('${ex.id}')">📤 Soumissions</button>
          <button class="btn-danger btn-sm" onclick="deleteExercise('${ex.id}')">🗑</button>
        </div>
      </div>
    </div>`;
  }).join("");
}
function filterExercises(){const q=document.getElementById("search-exercises").value.toLowerCase();renderExercises(allExercises.filter(e=>e.title.toLowerCase().includes(q)));}
function toggleExerciseType(val){
  const s=document.getElementById("exercise-qcm-section");
  s.style.display=val==="qcm"?"block":"none";
}
function addExerciseQuestion(){
  exerciseQCount2++;
  const c=document.getElementById("exercise-questions-container");
  const div=document.createElement("div");div.className="question-block";div.id=`exq-${exerciseQCount2}`;
  div.innerHTML=`<div class="question-header"><strong>Question ${exerciseQCount2}</strong><button class="btn-icon" onclick="this.closest('.question-block').remove()">✕</button></div>
    <div class="form-group"><input type="text" class="q-text" placeholder="Texte de la question"/></div>
    <div class="options-list">
      ${[0,1,2,3].map(i=>`<div class="option-row"><input type="radio" name="exq${exerciseQCount2}-correct" value="${i}"/><input type="text" class="q-option" placeholder="Option ${String.fromCharCode(65+i)}"/></div>`).join("")}
    </div><small style="color:var(--text-muted)">● = bonne réponse</small>`;
  c.appendChild(div);
}
async function createExercise(){
  const title=document.getElementById("new-exercise-title").value.trim();
  const desc=document.getElementById("new-exercise-desc").value.trim();
  const groupId=document.getElementById("new-exercise-group").value;
  const type=document.getElementById("new-exercise-type").value;
  const maxScore=parseInt(document.getElementById("new-exercise-maxscore").value)||20;
  const deadlineVal=document.getElementById("new-exercise-deadline").value;
  const errEl=document.getElementById("modal-exercise-error");errEl.classList.add("hidden");
  if(!title||!groupId){errEl.textContent="Titre et groupe obligatoires.";errEl.classList.remove("hidden");return;}
  const data={title,description:desc,type,groupId,maxScore,hasDeadline:!!deadlineVal,deadline:deadlineVal?new Date(deadlineVal):null,createdBy:window._currentUID,createdByName:window._currentName,createdAt:window._serverTimestamp()};
  if(type==="qcm"){
    const questions=[];
    document.querySelectorAll("#exercise-questions-container .question-block").forEach((block,qi)=>{
      const qText=block.querySelector(".q-text")?.value.trim()||"";
      const opts=[...block.querySelectorAll(".q-option")].map(i=>i.value.trim());
      const radios=block.querySelectorAll("input[type='radio']");
      let correct=0;radios.forEach((r,ri)=>{if(r.checked)correct=ri;});
      questions.push({question:qText,options:opts,correct});
    });
    data.questions=questions;
  }
  await window._addDoc(window._collection(window._db,"exercises"),data);
  closeModal("modal-add-exercise");
  await loadExercises();
  showAlert("exercises-alert","Exercice publié.","success");
}
async function deleteExercise(id){if(!confirm("Supprimer cet exercice ?"))return;await window._deleteDoc(window._doc(window._db,"exercises",id));await loadExercises();}
async function viewExerciseSubs(exerciseId){
  const nav=document.querySelector('[data-section="submissions"]');
  document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  if(nav)nav.classList.add("active");
  document.getElementById("section-submissions").classList.add("active");
  document.getElementById("section-title").textContent="Soumissions";
  document.getElementById("section-sub").textContent="Travaux soumis";
  const sel=document.getElementById("sub-exercise-filter");
  if(sel){await loadSubmissions();sel.value=exerciseId;}
  filterSubmissions();
}

// ===== SOUMISSIONS =====
async function loadSubmissions(){
  let q=window._currentRole==="teacher"
    ?window._query(window._collection(window._db,"submissions"),window._where("teacherId","==",window._currentUID),window._orderBy("submittedAt","desc"))
    :window._query(window._collection(window._db,"submissions"),window._orderBy("submittedAt","desc"));
  const snap=await window._getDocs(q);
  allSubmissions=[];snap.forEach(d=>allSubmissions.push({id:d.id,...d.data()}));
  // Populate filter
  populateSubmissionFilter();
  filterSubmissions();
}
function populateSubmissionFilter(){
  const sel=document.getElementById("sub-exercise-filter");if(!sel)return;
  sel.innerHTML='<option value="">— Tous les exercices —</option>'+allExercises.map(ex=>`<option value="${ex.id}">${ex.title}</option>`).join("");
}
function filterSubmissions(){
  const exFilter=document.getElementById("sub-exercise-filter")?.value||"";
  const statusFilter=document.getElementById("sub-status-filter")?.value||"";
  let list=allSubmissions;
  if(exFilter)list=list.filter(s=>s.exerciseId===exFilter);
  if(statusFilter)list=list.filter(s=>s.status===statusFilter);
  renderSubmissions(list);
}
function renderSubmissions(list){
  const c=document.getElementById("submissions-container");if(!c)return;
  if(!list.length){c.innerHTML='<div class="empty-state">Aucune soumission trouvée.</div>';return;}
  c.innerHTML=list.map(sub=>{
    const date=sub.submittedAt?.toDate?sub.submittedAt.toDate():new Date(sub.submittedAt||0);
    const isGraded=sub.status==="graded";
    return `<div class="submission-item">
      <div class="submission-header">
        <div>
          <div class="submission-student">${sub.studentName||"Élève"}</div>
          <div class="submission-exercise">Exercice : ${sub.exerciseTitle||sub.exerciseId||"—"}</div>
        </div>
        <div style="text-align:right">
          <span class="badge ${isGraded?"badge-done":"badge-info"}">${isGraded?"✓ Corrigé":"⏳ À corriger"}</span>
          <div class="submission-date">${date.toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"})}</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">
        <a class="submission-file-link" href="${sub.fileURL}" target="_blank" rel="noopener">📄 ${sub.fileName||"Télécharger le fichier"}</a>
        ${isGraded?`<span style="font-family:'Syne',sans-serif;font-weight:800;color:var(--success)">${sub.score}/${sub.maxScore}</span>${sub.teacherComment?`<span style="font-size:0.8rem;color:var(--text-muted);font-style:italic">"${sub.teacherComment}"</span>`:""}`:""}
      </div>
      ${!isGraded?`<div class="submission-grade-form">
        <button class="btn-primary btn-sm" onclick="openGradeModal('${sub.id}','${(sub.exerciseTitle||"").replace(/'/g,"\\'")}','${sub.studentName||""}',${sub.maxScore||20})">✏️ Corriger</button>
      </div>`:""}
    </div>`;
  }).join("");
}
function openGradeModal(subId,exerciseTitle,studentName,maxScore){
  document.getElementById("grade-submission-id").value=subId;
  document.getElementById("grade-submission-info").innerHTML=`<strong>Élève :</strong> ${studentName}<br><strong>Exercice :</strong> ${exerciseTitle}`;
  document.getElementById("grade-max").value=maxScore;
  document.getElementById("grade-maxlabel").textContent=`Sur ${maxScore}`;
  document.getElementById("grade-score").value="";
  document.getElementById("grade-comment").value="";
  openModal("modal-grade-submission");
}
async function saveGrade(){
  const subId=document.getElementById("grade-submission-id").value;
  const score=parseFloat(document.getElementById("grade-score").value);
  const maxScore=parseFloat(document.getElementById("grade-max").value);
  const comment=document.getElementById("grade-comment").value.trim();
  if(isNaN(score)||score<0||score>maxScore){alert(`La note doit être entre 0 et ${maxScore}.`);return;}
  await window._updateDoc(window._doc(window._db,"submissions",subId),{score,teacherComment:comment,status:"graded",correctedAt:window._serverTimestamp()});
  closeModal("modal-grade-submission");
  await loadSubmissions();
}

// ===== SONDAGES =====
async function loadPolls(){
  let q=window._currentRole==="teacher"
    ?window._query(window._collection(window._db,"polls"),window._where("createdBy","==",window._currentUID),window._orderBy("createdAt","desc"))
    :window._query(window._collection(window._db,"polls"),window._orderBy("createdAt","desc"));
  const snap=await window._getDocs(q);
  allPolls=[];snap.forEach(d=>allPolls.push({id:d.id,...d.data()}));
  renderPolls(allPolls);
}
function renderPolls(list){
  const g=document.getElementById("polls-grid");if(!g)return;
  if(!list.length){g.innerHTML='<div class="empty-state">Aucun sondage.</div>';return;}
  g.innerHTML=list.map(p=>{
    const gr=allGroups.find(g=>g.id===p.groupId);
    const totalVotes=(p.options||[]).reduce((acc,o)=>acc+(o.votes||0),0);
    return `<div class="poll-card">
      <div class="poll-card-header">
        <div>
          <div class="poll-title">${p.title}</div>
          <div class="poll-meta">${gr?gr.name:"Tous"} · ${totalVotes} vote(s)</div>
        </div>
        <span class="badge ${p.isActive?"badge-done":"badge-muted"}">${p.isActive?"Actif":"Inactif"}</span>
      </div>
      ${(p.options||[]).map(opt=>{
        const pct=totalVotes?Math.round((opt.votes||0)/totalVotes*100):0;
        return `<div class="poll-result-row">
          <div class="poll-result-label"><span>${opt.text}</span><span>${opt.votes||0} (${pct}%)</span></div>
          <div class="poll-result-bar-track"><div class="poll-result-bar-fill" style="width:${pct}%"></div></div>
        </div>`;
      }).join("")}
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:1rem">
        <button class="btn-sm ${p.isActive?"btn-danger":"btn-success"}" onclick="togglePoll('${p.id}',${!p.isActive})">${p.isActive?"Désactiver":"Activer"}</button>
        <button class="btn-danger btn-sm" onclick="deletePoll('${p.id}')">🗑</button>
      </div>
    </div>`;
  }).join("");
}
function filterPolls(){const q=document.getElementById("search-polls").value.toLowerCase();renderPolls(allPolls.filter(p=>p.title.toLowerCase().includes(q)));}
function addPollOption(){
  const c=document.getElementById("poll-options-container");
  const d=document.createElement("div");d.className="option-row";d.style.marginBottom="0.4rem";
  d.innerHTML=`<input type="text" class="poll-opt-input" placeholder="Option ${c.children.length+1}"/>`;
  c.appendChild(d);
}
async function createPoll(){
  const title=document.getElementById("new-poll-title").value.trim();
  const desc=document.getElementById("new-poll-desc").value.trim();
  const groupId=document.getElementById("new-poll-group").value;
  const openAt=document.getElementById("new-poll-open").value;
  const closeAt=document.getElementById("new-poll-close").value;
  const opts=[...document.querySelectorAll(".poll-opt-input")].map(i=>i.value.trim()).filter(Boolean);
  const errEl=document.getElementById("modal-poll-error");errEl.classList.add("hidden");
  if(!title||opts.length<2){errEl.textContent="Titre et au moins 2 options obligatoires.";errEl.classList.remove("hidden");return;}
  await window._addDoc(window._collection(window._db,"polls"),{
    title,description:desc,groupId:groupId||"",
    options:opts.map(text=>({text,votes:0})),
    openAt:openAt?new Date(openAt):null,closeAt:closeAt?new Date(closeAt):null,
    isActive:true,createdBy:window._currentUID,createdByName:window._currentName,
    createdAt:window._serverTimestamp()
  });
  closeModal("modal-add-poll");
  await loadPolls();
  showAlert("polls-alert","Sondage créé.","success");
}
async function togglePoll(id,active){await window._updateDoc(window._doc(window._db,"polls",id),{isActive:active});await loadPolls();}
async function deletePoll(id){if(!confirm("Supprimer ce sondage ?"))return;await window._deleteDoc(window._doc(window._db,"polls",id));await loadPolls();}

// ===== QUIZ =====
async function loadQuizzes(){
  let q=window._currentRole==="teacher"
    ?window._query(window._collection(window._db,"quizzes"),window._where("createdBy","==",window._currentUID),window._orderBy("createdAt","desc"))
    :window._query(window._collection(window._db,"quizzes"),window._orderBy("createdAt","desc"));
  const snap=await window._getDocs(q);
  allQuizzesList=[];snap.forEach(d=>allQuizzesList.push({id:d.id,...d.data()}));
  renderQuizzes(allQuizzesList);
}
function renderQuizzes(list){
  const tbody=document.getElementById("quizzes-tbody");if(!tbody)return;
  if(!list.length){tbody.innerHTML='<tr><td colspan="5" class="table-loading">Aucun quiz.</td></tr>';return;}
  tbody.innerHTML=list.map(q=>{
    const gr=allGroups.find(g=>g.id===q.groupId);
    return `<tr>
      <td><strong>${q.title}</strong></td>
      <td class="hide-mobile" style="font-size:0.82rem;color:var(--text-muted)">${q.courseTitle||"—"}</td>
      <td><span class="badge">${(q.questions||[]).length} Qs</span></td>
      <td class="hide-mobile" style="font-size:0.82rem;color:var(--text-muted)">${gr?gr.name:"Tous"}</td>
      <td><button class="btn-danger btn-sm" onclick="deleteQuiz('${q.id}')">🗑</button></td>
    </tr>`;
  }).join("");
}
function filterQuizzes(){const q=document.getElementById("search-quizzes").value.toLowerCase();renderQuizzes(allQuizzesList.filter(quiz=>quiz.title.toLowerCase().includes(q)));}
function addQuestion(){
  questionCount++;
  const c=document.getElementById("questions-container");
  const div=document.createElement("div");div.className="question-block";div.id=`question-${questionCount}`;
  div.innerHTML=`<div class="question-header"><strong>Question ${questionCount}</strong><button class="btn-icon" onclick="this.closest('.question-block').remove()">✕</button></div>
    <div class="form-group"><input type="text" class="q-text" placeholder="Texte de la question"/></div>
    <div class="options-list">
      ${[0,1,2,3].map(i=>`<div class="option-row"><input type="radio" name="q${questionCount}-correct" value="${i}"/><input type="text" class="q-option" placeholder="Option ${String.fromCharCode(65+i)}"/></div>`).join("")}
    </div><small style="color:var(--text-muted)">● = bonne réponse</small>`;
  c.appendChild(div);
}
async function createQuiz(){
  const title=document.getElementById("new-quiz-title").value.trim();
  const courseId=document.getElementById("new-quiz-course").value;
  const groupId=document.getElementById("new-quiz-group").value;
  const errEl=document.getElementById("modal-quiz-error");errEl.classList.add("hidden");
  if(!title){errEl.textContent="Le titre est obligatoire.";errEl.classList.remove("hidden");return;}
  const questions=[];
  document.querySelectorAll("#questions-container .question-block").forEach(block=>{
    const qText=block.querySelector(".q-text")?.value.trim()||"";
    const opts=[...block.querySelectorAll(".q-option")].map(i=>i.value.trim());
    const radios=block.querySelectorAll("input[type='radio']");
    let correct=0;radios.forEach((r,ri)=>{if(r.checked)correct=ri;});
    questions.push({question:qText,options:opts,correct});
  });
  const course=allCourses.find(c=>c.id===courseId);
  await window._addDoc(window._collection(window._db,"quizzes"),{title,courseId:courseId||"",courseTitle:course?.title||"",groupId:groupId||"",questions,createdBy:window._currentUID,createdByName:window._currentName,createdAt:window._serverTimestamp()});
  closeModal("modal-add-quiz");
  await loadQuizzes();
  showAlert("quizzes-alert","Quiz publié.","success");
}
async function deleteQuiz(id){if(!confirm("Supprimer ce quiz ?"))return;await window._deleteDoc(window._doc(window._db,"quizzes",id));await loadQuizzes();}

// ===== ATTESTATIONS =====
async function loadCertificates(){
  const snap=await window._getDocs(window._query(window._collection(window._db,"certificates"),window._orderBy("issuedAt","desc")));
  allCerts=[];snap.forEach(d=>allCerts.push({id:d.id,...d.data()}));
  renderCertificates(allCerts);
}
function renderCertificates(list){
  const el=document.getElementById("certs-list");if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty-state">Aucune attestation délivrée.</div>';return;}
  el.innerHTML=list.map(c=>`<div class="cert-card">
    <div class="cert-icon">🏆</div>
    <div class="cert-info">
      <div class="cert-title">${c.studentName||"—"}</div>
      <div class="cert-meta">Formation : ${c.formationTitle||"—"}</div>
      ${c.note?`<div style="font-size:0.78rem;color:var(--text-muted);font-style:italic">${c.note}</div>`:""}
      <div class="cert-date">Délivrée le ${c.issuedAt?.toDate?c.issuedAt.toDate().toLocaleDateString("fr-FR"):""} par ${c.issuedByName||"Admin"}</div>
    </div>
    <button class="btn-danger btn-sm" onclick="deleteCert('${c.id}')">🗑</button>
  </div>`).join("");
}
function filterCertificates(){const q=document.getElementById("search-certs").value.toLowerCase();renderCertificates(allCerts.filter(c=>(c.studentName||"").toLowerCase().includes(q)));}
async function createCertificate(){
  const studentId=document.getElementById("cert-student").value;
  const formationId=document.getElementById("cert-formation").value;
  const note=document.getElementById("cert-note").value.trim();
  const errEl=document.getElementById("modal-cert-error");errEl.classList.add("hidden");
  if(!studentId||!formationId){errEl.textContent="Élève et formation obligatoires.";errEl.classList.remove("hidden");return;}
  const student=allStudents.find(s=>s.id===studentId);
  const formation=allFormations.find(f=>f.id===formationId);
  await window._addDoc(window._collection(window._db,"certificates"),{
    studentId,studentName:student?.fullName||"",formationId,formationTitle:formation?.title||"",
    note,issuedBy:window._currentUID,issuedByName:window._currentName,issuedAt:window._serverTimestamp()
  });
  closeModal("modal-add-cert");
  await loadCertificates();
  showAlert("certs-alert","Attestation délivrée.","success");
}
async function deleteCert(id){if(!confirm("Révoquer cette attestation ?"))return;await window._deleteDoc(window._doc(window._db,"certificates",id));await loadCertificates();}

// ===== PRÉSENCES (teacher) =====
async function loadAttGroups(){
  const sel=document.getElementById("att-group-select");if(!sel)return;
  const myGroups=allGroups.filter(g=>window._currentRole==="teacher"?g.teacherId===window._currentUID:true);
  sel.innerHTML='<option value="">— Choisir un groupe —</option>'+myGroups.map(g=>`<option value="${g.id}">${g.name}</option>`).join("");
  // Set today
  const d=new Date();document.getElementById("att-date").value=d.toISOString().slice(0,10);
}
async function loadAttendanceForm(){
  const groupId=document.getElementById("att-group-select").value;
  const c=document.getElementById("attendance-form-container");
  if(!groupId){c.innerHTML='<div class="empty-state">Choisissez un groupe.</div>';return;}
  const gr=allGroups.find(g=>g.id===groupId);
  const students=allStudents.filter(s=>(gr?.studentIds||[]).includes(s.id));
  if(!students.length){c.innerHTML='<div class="empty-state">Aucun élève dans ce groupe.</div>';return;}
  c.innerHTML=`<div class="att-form-card">
    <div class="att-form-header">
      <div><strong style="font-family:'Syne',sans-serif">${gr.name}</strong><div style="font-size:0.82rem;color:var(--text-muted)">${students.length} élèves</div></div>
      <button class="btn-primary" onclick="saveAttendance('${groupId}')">💾 Enregistrer</button>
    </div>
    ${students.map(s=>`<div class="att-student-row" id="att-row-${s.id}">
      <div class="att-student-name">${s.fullName}</div>
      <div class="att-status-btns">
        <button class="att-btn present active" onclick="setAttStatus('${s.id}','present')">✅ Présent</button>
        <button class="att-btn absent" onclick="setAttStatus('${s.id}','absent')">❌ Absent</button>
        <button class="att-btn late" onclick="setAttStatus('${s.id}','late')">⏰ Retard</button>
      </div>
      <input type="text" class="att-note-input" id="att-note-${s.id}" placeholder="Note..."/>
    </div>`).join("")}
  </div>`;
  await loadAttendanceHistory(groupId);
}
function setAttStatus(studentId,status){
  const row=document.getElementById(`att-row-${studentId}`);if(!row)return;
  row.querySelectorAll(".att-btn").forEach(b=>{b.classList.remove("active");if(b.classList.contains(status))b.classList.add("active");});
}
async function saveAttendance(groupId){
  const session=document.getElementById("att-session-name").value.trim()||"Séance";
  const dateVal=document.getElementById("att-date").value;
  const date=dateVal?new Date(dateVal):new Date();
  const gr=allGroups.find(g=>g.id===groupId);
  const students=allStudents.filter(s=>(gr?.studentIds||[]).includes(s.id));
  const batch=[];
  for(const s of students){
    const row=document.getElementById(`att-row-${s.id}`);if(!row)continue;
    const activeBtn=row.querySelector(".att-btn.active");
    const status=activeBtn?activeBtn.classList[1]:"present";
    const note=document.getElementById(`att-note-${s.id}`)?.value.trim()||"";
    batch.push(window._addDoc(window._collection(window._db,"attendance"),{
      studentId:s.id,studentName:s.fullName,groupId,session,date:window._serverTimestamp(),
      status,note,markedBy:window._currentUID,createdAt:window._serverTimestamp()
    }));
  }
  await Promise.all(batch);
  alert("Présences enregistrées !");
  await loadAttendanceHistory(groupId);
}
async function loadAttendanceHistory(groupId){
  const c=document.getElementById("attendance-history-container");if(!c)return;
  const snap=await window._getDocs(window._query(window._collection(window._db,"attendance"),window._where("groupId","==",groupId),window._orderBy("createdAt","desc")));
  const records=[];snap.forEach(d=>records.push({id:d.id,...d.data()}));
  if(!records.length){c.innerHTML="";return;}
  // Group by session
  const sessions={};records.forEach(r=>{if(!sessions[r.session])sessions[r.session]=[];sessions[r.session].push(r);});
  c.innerHTML=`<div class="table-card"><h3 style="font-family:'Syne',sans-serif;margin-bottom:0.8rem">Historique des présences</h3>
  ${Object.entries(sessions).slice(0,10).map(([session,recs])=>`<div style="margin-bottom:1rem">
    <div style="font-weight:600;font-size:0.88rem;margin-bottom:0.4rem;color:var(--text-muted)">${session}</div>
    <div style="display:flex;flex-wrap:wrap;gap:0.4rem">
      ${recs.map(r=>`<span class="badge ${r.status==="present"?"badge-done":r.status==="absent"?"badge-error":""}">${r.studentName.split(" ")[0]}</span>`).join("")}
    </div>
  </div>`).join("")}
  </div>`;
}

// ===== SUIVI ÉLÈVES (teacher) =====
async function loadTrackingGroups(){
  const sel=document.getElementById("tracking-group-select");if(!sel)return;
  const myGroups=allGroups.filter(g=>window._currentRole==="teacher"?g.teacherId===window._currentUID:true);
  sel.innerHTML='<option value="">— Choisir un groupe —</option>'+myGroups.map(g=>`<option value="${g.id}">${g.name}</option>`).join("");
}
async function loadTrackingStudents(groupId){
  const c=document.getElementById("tracking-content");
  if(!groupId){c.innerHTML='<div class="empty-state">Sélectionnez un groupe.</div>';return;}
  const gr=allGroups.find(g=>g.id===groupId);
  const students=allStudents.filter(s=>(gr?.studentIds||[]).includes(s.id));
  if(!students.length){c.innerHTML='<div class="empty-state">Aucun élève dans ce groupe.</div>';return;}
  // Load quiz results for each student
  const rows=await Promise.all(students.map(async s=>{
    const snap=await window._getDocs(window._collection(window._db,"users",s.id,"quizResults"));
    const results=[];snap.forEach(d=>results.push(d.data()));
    const avgScore=results.length?Math.round(results.reduce((acc,r)=>acc+(r.score||0),0)/results.length):0;
    const attSnap=await window._getDocs(window._query(window._collection(window._db,"attendance"),window._where("studentId","==",s.id),window._where("groupId","==",groupId)));
    const attRecs=[];attSnap.forEach(d=>attRecs.push(d.data()));
    const present=attRecs.filter(r=>r.status==="present").length;
    const total=attRecs.length;
    return {student:s,avgScore,quizCount:results.length,present,total,pct:s.progressPct||0};
  }));
  c.innerHTML=`<div class="table-card"><div class="table-responsive"><table class="data-table">
    <thead><tr><th>Élève</th><th>Score moy.</th><th>Quiz</th><th>Présences</th><th>Progression</th></tr></thead>
    <tbody>${rows.map(r=>`<tr>
      <td><strong>${r.student.fullName}</strong></td>
      <td><span style="font-family:'Syne',sans-serif;font-weight:800;color:${r.avgScore>=50?"var(--success)":"var(--error)"}">${r.avgScore}%</span></td>
      <td>${r.quizCount}</td>
      <td>${r.total?`${r.present}/${r.total} (${Math.round(r.present/r.total*100)}%)`:"—"}</td>
      <td>
        <div class="progress-mini-wrap">
          <div class="progress-mini-track"><div class="progress-mini-fill" style="width:${r.pct}%"></div></div>
          <span style="font-size:0.78rem;color:var(--accent)">${r.pct}%</span>
        </div>
      </td>
    </tr>`).join("")}</tbody>
  </table></div></div>`;
}

// ===== MES GROUPES (teacher) =====
async function loadMyGroups(){
  const myGroups=allGroups.filter(g=>g.teacherId===window._currentUID);
  const g=document.getElementById("mygroups-grid");if(!g)return;
  if(!myGroups.length){g.innerHTML='<div class="empty-state">Aucun groupe attribué.</div>';return;}
  g.innerHTML=myGroups.map(gr=>{
    const formation=allFormations.find(f=>f.id===gr.formationId);
    return `<div class="group-card">
      <div class="group-card-header"><div class="group-name">${gr.name}</div><span class="badge badge-info">${(gr.studentIds||[]).length} élèves</span></div>
      <div class="group-meta">Formation : <span>${formation?.title||"—"}</span></div>
      <div class="formation-actions">
        <button class="btn-primary btn-sm" onclick="goToAttendance('${gr.id}')">📋 Présences</button>
        <button class="btn-info btn-sm" onclick="loadTrackingStudents('${gr.id}');document.getElementById('tracking-group-select').value='${gr.id}'">📈 Suivi</button>
      </div>
    </div>`;
  }).join("");
}
function goToAttendance(groupId){
  document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
  document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
  const nav=document.querySelector('[data-section="attendance"]');if(nav)nav.classList.add("active");
  document.getElementById("section-attendance").classList.add("active");
  document.getElementById("section-title").textContent="Présences";
  document.getElementById("section-sub").textContent="Saisie et historique";
  loadAttGroups().then(()=>{
    document.getElementById("att-group-select").value=groupId;
    loadAttendanceForm();
  });
}

// ===== STATS =====
async function loadStats(){
  const [formsSnap,studSnap,teachSnap,coursSnap,exSnap,subSnap]=await Promise.all([
    window._getDocs(window._collection(window._db,"formations")),
    window._getDocs(window._query(window._collection(window._db,"users"),window._where("role","==","student"))),
    window._getDocs(window._query(window._collection(window._db,"users"),window._where("role","==","teacher"))),
    window._getDocs(window._collection(window._db,"courses")),
    window._getDocs(window._collection(window._db,"exercises")),
    window._getDocs(window._collection(window._db,"submissions"))
  ]);
  document.getElementById("stat-formations").textContent=formsSnap.size;
  document.getElementById("stat-students").textContent=studSnap.size;
  document.getElementById("stat-teachers").textContent=teachSnap.size;
  document.getElementById("stat-courses").textContent=coursSnap.size;
  document.getElementById("stat-exercises").textContent=exSnap.size;
  document.getElementById("stat-submissions").textContent=subSnap.size;
  // Top students
  const students=[];studSnap.forEach(d=>students.push({id:d.id,...d.data()}));
  const topData=await Promise.all(students.slice(0,10).map(async s=>{
    const snap=await window._getDocs(window._collection(window._db,"users",s.id,"quizResults"));
    const results=[];snap.forEach(d=>results.push(d.data()));
    const avg=results.length?Math.round(results.reduce((a,r)=>a+(r.score||0),0)/results.length):0;
    const gr=allGroups.find(g=>(g.studentIds||[]).includes(s.id));
    return {name:s.fullName,group:gr?.name||"—",quizzes:results.length,avg};
  }));
  topData.sort((a,b)=>b.avg-a.avg);
  const tbody=document.getElementById("top-students-tbody");
  tbody.innerHTML=topData.map(t=>`<tr>
    <td><strong>${t.name}</strong></td>
    <td style="font-size:0.82rem;color:var(--text-muted)">${t.group}</td>
    <td>${t.quizzes}</td>
    <td><strong style="color:${t.avg>=50?"var(--success)":"var(--error)"}">${t.avg}%</strong></td>
  </tr>`).join("") || '<tr><td colspan="4" class="table-loading">Aucune donnée.</td></tr>';
}

// ===== UTILS =====
function showAlert(id,msg,type="success"){
  const el=document.getElementById(id);if(!el)return;
  el.textContent=msg;el.className=`alert alert-${type}`;el.classList.remove("hidden");
  setTimeout(()=>el.classList.add("hidden"),3000);
}
