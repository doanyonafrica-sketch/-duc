const DAYS = ["Lundi","Mardi","Mercredi","Jeudi","Vendredi"];
const TIMES = ["07h00 - 08h30","08h30 - 10h00","10h00 - 11h30","11h30 - 13h00","14h00 - 15h30","15h30 - 17h00","17h00 - 18h30"];
let currentWeekMonday = getThisMonday();

function getThisMonday(d=new Date()){
  const day=d.getDay()||7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate()-day+1);
  return new Date(d);
}

function changeWeek(dir){ currentWeekMonday.setDate(currentWeekMonday.getDate()+dir*7); renderPlanning(); }

function logout(){ window._signOut(window._auth).then(()=>window.location.href="index.html"); }
function openModal(id){ document.getElementById(id).classList.remove("hidden"); }
function closeModal(id){ document.getElementById(id).classList.add("hidden"); }
document.querySelectorAll(".modal-overlay").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden");}));

function initPlanning(){
  // Pré-remplir la date de la semaine dans le modal
  const d=new Date(currentWeekMonday); const iso=d.toISOString().slice(0,10);
  if(document.getElementById("slot-week")) document.getElementById("slot-week").value=iso;
  renderPlanning();
}

async function renderPlanning(){
  const monday=new Date(currentWeekMonday);
  const sunday=new Date(monday); sunday.setDate(monday.getDate()+6);
  // Label semaine
  const fmt=d=>d.toLocaleDateString("fr-FR",{day:"numeric",month:"long"});
  document.getElementById("week-label").textContent=`Semaine du ${fmt(monday)} au ${fmt(sunday)}`;
  // Charger les séances de la semaine
  const db=window._db;
  const mStr=monday.toISOString().slice(0,10);
  const sStr=sunday.toISOString().slice(0,10);
  const snap=await window._getDocs(window._query(window._collection(db,"schedule"),window._where("weekStart",">=",mStr),window._where("weekStart","<=",sStr)));
  const slots={}; // slots[dayIndex][timeIndex] = data
  snap.forEach(d=>{
    const s=d.data();
    if(!slots[s.dayIndex]) slots[s.dayIndex]={};
    if(!slots[s.dayIndex][s.timeIndex]) slots[s.dayIndex][s.timeIndex]=[];
    slots[s.dayIndex][s.timeIndex].push({id:d.id,...s});
  });
  const today=new Date(); today.setHours(0,0,0,0);
  const grid=document.getElementById("planning-week");
  grid.innerHTML=DAYS.map((day,di)=>{
    const dayDate=new Date(monday); dayDate.setDate(monday.getDate()+di);
    const isToday=dayDate.getTime()===today.getTime();
    return `<div class="planning-day-col">
      <div class="planning-day-header ${isToday?"today":""}">
        ${day}<br><span style="font-weight:400;font-size:0.75rem">${dayDate.toLocaleDateString("fr-FR",{day:"numeric",month:"short"})}</span>
      </div>
      ${TIMES.map((time,ti)=>{
        const s=slots[di]&&slots[di][ti]?slots[di][ti][0]:null;
        if(s) return `<div class="planning-slot filled" title="${s.room||""}">
          <div class="planning-slot-time">${time}</div>
          <div class="planning-slot-course">${s.course}</div>
          <div class="planning-slot-teacher">${s.teacher||""} ${s.room?"· "+s.room:""}</div>
          ${(window._currentUser?.role==="admin"||window._currentUser?.role==="teacher")?
            `<button class="btn-icon" style="font-size:0.7rem;margin-top:4px" onclick="deleteSlot('${s.id}')">✕ Supprimer</button>`:""}
        </div>`;
        return `<div class="planning-slot"><div class="planning-slot-time">${time}</div><div style="color:var(--text-dim);font-size:0.78rem">—</div></div>`;
      }).join("")}
    </div>`;
  }).join("");
}

async function addSlot(){
  const dayIndex=parseInt(document.getElementById("slot-day").value);
  const timeIndex=parseInt(document.getElementById("slot-time").selectedIndex);
  const course=document.getElementById("slot-course").value.trim();
  const room=document.getElementById("slot-room").value.trim();
  const weekStart=document.getElementById("slot-week").value;
  if(!course||!weekStart) return;
  await window._addDoc(window._collection(window._db,"schedule"),{
    dayIndex,timeIndex,course,room,weekStart,
    teacher:window._currentUser.fullName,
    teacherId:window._currentUser.uid,
    createdAt:window._serverTimestamp()
  });
  closeModal("modal-add-slot");
  // Mettre à jour weekStart dans modal
  currentWeekMonday=getThisMonday(new Date(weekStart+"T12:00:00"));
  renderPlanning();
}

async function deleteSlot(id){
  if(!confirm("Supprimer cette séance ?")) return;
  await window._deleteDoc(window._doc(window._db,"schedule",id));
  renderPlanning();
}
