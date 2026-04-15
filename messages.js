let currentConvId = null;
let unsubscribeMessages = null;

document.querySelectorAll(".nav-item[data-section]").forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const t = item.dataset.section;
    document.querySelectorAll(".nav-item").forEach(i=>i.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(s=>s.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("section-"+t).classList.add("active");
    const titles = { inbox:["Messagerie","Vos conversations"], announces:["Annonces","Messages diffusés à tous"] };
    if(titles[t]){ document.getElementById("msg-title").textContent=titles[t][0]; document.getElementById("msg-sub").textContent=titles[t][1]; }
    if(t==="announces") loadAnnounces();
  });
});

async function logout(){ await window._signOut(window._auth); window.location.href="index.html"; }
function openModal(id){ document.getElementById(id).classList.remove("hidden"); }
function closeModal(id){ document.getElementById(id).classList.add("hidden"); }
document.querySelectorAll(".modal-overlay").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)m.classList.add("hidden");}));

async function initMessaging(){
  await loadContacts();
  await loadConversations();
  loadAnnounces();
}

// Charger contacts (admin, profs, élèves selon rôle)
async function loadContacts(){
  const db = window._db;
  const snap = await window._getDocs(window._collection(db,"users"));
  const opts = [];
  snap.forEach(d=>{
    const data=d.data();
    if(d.id===window._currentUser.uid) return;
    if(data.role==="student"&&window._currentUser.role==="student") return; // élèves ne parlent pas entre eux
    opts.push({ uid:d.id, name:data.fullName||"—", role:data.role });
  });
  const sel = document.getElementById("msg-recipient");
  sel.innerHTML = `<option value="">— Choisir —</option>` +
    opts.map(o=>`<option value="${o.uid}">${o.name} (${o.role==="admin"?"Admin":o.role==="teacher"?"Prof":"Élève"})</option>`).join("");
}

async function loadConversations(){
  const db=window._db, uid=window._currentUser.uid;
  const snap = await window._getDocs(window._query(
    window._collection(db,"conversations"),
    window._where("participants","array-contains",uid)
  ));
  const convs=[];
  for(const d of snap.docs){
    const data=d.data();
    const otherId = data.participants.find(p=>p!==uid);
    const otherDoc = await window._getDoc(window._doc(db,"users",otherId));
    convs.push({ id:d.id, ...data, otherName:otherDoc.exists()?otherDoc.data().fullName:"Inconnu", otherId });
  }
  convs.sort((a,b)=>(b.lastAt?.seconds||0)-(a.lastAt?.seconds||0));
  const list=document.getElementById("conversations-list");
  if(!convs.length){ list.innerHTML=`<div class="empty-state" style="padding:2rem">Aucune conversation</div>`; return; }
  list.innerHTML=convs.map(c=>`
    <div class="conv-item ${c.id===currentConvId?"active":""}" onclick="openConversation('${c.id}','${c.otherName}','${c.otherId}')">
      <div style="overflow:hidden">
        <span class="conv-item-time">${c.lastAt?new Date(c.lastAt.seconds*1000).toLocaleDateString("fr-FR"):""}</span>
        <div class="conv-item-name">${c.otherName}</div>
        <div class="conv-item-preview">${c.lastMessage||"—"}</div>
      </div>
    </div>`).join("");
}

function openConversation(convId, otherName, otherId){
  currentConvId=convId;
  if(unsubscribeMessages) unsubscribeMessages();
  const panel=document.getElementById("chat-panel");
  panel.innerHTML=`
    <div class="chat-header">
      <span>${otherName}</span>
      <span style="font-size:0.78rem;color:var(--text-muted);font-weight:400">Conversation privée</span>
    </div>
    <div class="chat-messages" id="chat-msgs"></div>
    <div class="chat-input-bar">
      <input type="text" id="chat-input" placeholder="Votre message..." onkeydown="if(event.key==='Enter')sendMessage('${convId}')"/>
      <button class="btn-primary btn-sm" onclick="sendMessage('${convId}')">Envoyer</button>
    </div>`;
  // Écoute temps réel
  const q=window._query(window._collection(window._db,"conversations",convId,"messages"),window._orderBy("sentAt","asc"));
  unsubscribeMessages = window._onSnapshot(q, snap=>{
    const msgs=[];
    snap.forEach(d=>msgs.push(d.data()));
    const container=document.getElementById("chat-msgs");
    if(!container) return;
    container.innerHTML=msgs.map(m=>{
      const isMe=m.senderId===window._currentUser.uid;
      return `<div style="display:flex;flex-direction:column;align-items:${isMe?"flex-end":"flex-start"}">
        <div class="chat-msg ${isMe?"sent":"received"}">${m.text}</div>
        <div class="chat-msg-time" style="align-self:${isMe?"flex-end":"flex-start"};font-size:0.7rem;color:var(--text-dim);margin:0 4px 4px">
          ${m.sentAt?new Date(m.sentAt.seconds*1000).toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"}):""}
        </div>
      </div>`;
    }).join("");
    container.scrollTop=container.scrollHeight;
  });
  // Marquer conversations comme lues
  loadConversations();
}

async function sendMessage(convId){
  const input=document.getElementById("chat-input");
  const text=input.value.trim(); if(!text) return;
  input.value="";
  const db=window._db;
  await window._addDoc(window._collection(db,"conversations",convId,"messages"),{
    senderId:window._currentUser.uid, senderName:window._currentUser.fullName, text, sentAt:window._serverTimestamp()
  });
  await window._updateDoc(window._doc(db,"conversations",convId),{ lastMessage:text, lastAt:window._serverTimestamp() });
}

async function sendNewMessage(){
  const recipientId=document.getElementById("msg-recipient").value;
  const body=document.getElementById("msg-body").value.trim();
  if(!recipientId||!body) return;
  const db=window._db, uid=window._currentUser.uid;
  // Chercher conversation existante
  const snap=await window._getDocs(window._query(window._collection(db,"conversations"),window._where("participants","array-contains",uid)));
  let convId=null;
  snap.forEach(d=>{ if(d.data().participants.includes(recipientId)) convId=d.id; });
  if(!convId){
    const ref=await window._addDoc(window._collection(db,"conversations"),{
      participants:[uid,recipientId], lastMessage:body, lastAt:window._serverTimestamp(), createdAt:window._serverTimestamp()
    });
    convId=ref.id;
  }
  await window._addDoc(window._collection(db,"conversations",convId,"messages"),{
    senderId:uid, senderName:window._currentUser.fullName, text:body, sentAt:window._serverTimestamp()
  });
  await window._updateDoc(window._doc(db,"conversations",convId),{ lastMessage:body, lastAt:window._serverTimestamp() });
  closeModal("modal-new-msg");
  document.getElementById("msg-body").value="";
  await loadConversations();
  const otherDoc=await window._getDoc(window._doc(db,"users",recipientId));
  openConversation(convId,otherDoc.data()?.fullName||"—",recipientId);
}

async function openNewMessage(){ openModal("modal-new-msg"); }

// ANNONCES
async function loadAnnounces(){
  const snap=await window._getDocs(window._query(window._collection(window._db,"announces"),window._orderBy("createdAt","desc")));
  const anns=[]; snap.forEach(d=>anns.push({ id:d.id,...d.data() }));
  const el=document.getElementById("announces-list");
  if(!anns.length){ el.innerHTML=`<div class="empty-state">📢 Aucune annonce pour le moment.</div>`; return; }
  el.innerHTML=anns.map(a=>`
    <div class="announce-card">
      <div class="announce-title">${a.title}</div>
      <div class="announce-body">${a.body}</div>
      <div class="announce-meta">Par ${a.authorName||"—"} · ${a.createdAt?new Date(a.createdAt.seconds*1000).toLocaleDateString("fr-FR",{day:"numeric",month:"long",year:"numeric"}):""}</div>
    </div>`).join("");
}

async function publishAnnounce(){
  const title=document.getElementById("ann-title").value.trim();
  const body=document.getElementById("ann-body").value.trim();
  if(!title||!body) return;
  await window._addDoc(window._collection(window._db,"announces"),{
    title, body, authorId:window._currentUser.uid, authorName:window._currentUser.fullName, createdAt:window._serverTimestamp()
  });
  document.getElementById("ann-title").value="";
  document.getElementById("ann-body").value="";
  document.getElementById("new-announce-form").classList.add("hidden");
  loadAnnounces();
}
