let currentConvId = null;
let unsubscribeMessages = null;

// ===== SIDEBAR =====
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

// ===== NAV =====
document.querySelectorAll(".nav-item[data-section]").forEach(item => {
  item.addEventListener("click", e => {
    e.preventDefault();
    const t = item.dataset.section;
    document.querySelectorAll(".nav-item").forEach(i => i.classList.remove("active"));
    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
    item.classList.add("active");
    document.getElementById("section-" + t).classList.add("active");
    const titles = {
      inbox: ["Messagerie", "Vos conversations privées"],
      announces: ["Annonces", "Messages diffusés à tous"]
    };
    if (titles[t]) {
      document.getElementById("msg-title").textContent = titles[t][0];
      document.getElementById("msg-sub").textContent = titles[t][1];
    }
    if (t === "announces") loadAnnounces();
    closeMobileSidebar();
  });
});

// ===== UTILS =====
async function logout() { await window._signOut(window._auth); window.location.href = "index.html"; }
function openModal(id) { document.getElementById(id)?.classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id)?.classList.add("hidden"); }
document.querySelectorAll(".modal-overlay").forEach(m => m.addEventListener("click", e => { if (e.target === m) m.classList.add("hidden"); }));

function toggleAnnounceForm() {
  const form = document.getElementById("new-announce-form");
  form.classList.toggle("hidden");
}

// ===== INIT =====
async function initMessaging() {
  await loadContacts();
  await loadConversations();
  loadAnnounces();
}

// ===== CONTACTS =====
async function loadContacts() {
  const db = window._db;
  const snap = await window._getDocs(window._collection(db, "users"));
  const opts = [];
  snap.forEach(d => {
    const data = d.data();
    if (d.id === window._currentUser.uid) return;
    const myRole = window._currentUser.role;
    // Élève : peut contacter profs et admins seulement
    if (myRole === "student" && (data.role === "student" || data.role === "parent")) return;
    // Parent : peut contacter profs et admins seulement
    if (myRole === "parent" && (data.role === "student" || data.role === "parent")) return;
    opts.push({ uid: d.id, name: data.fullName || "—", role: data.role });
  });
  const sel = document.getElementById("msg-recipient");
  const roleLabel = { admin: "Admin", teacher: "Prof", student: "Élève", parent: "Parent" };
  sel.innerHTML = `<option value="">— Choisir —</option>` +
    opts.map(o => `<option value="${o.uid}">${o.name} (${roleLabel[o.role] || o.role})</option>`).join("");
}

// ===== CONVERSATIONS =====
async function loadConversations() {
  const db = window._db, uid = window._currentUser.uid;
  const snap = await window._getDocs(window._query(
    window._collection(db, "conversations"),
    window._where("participants", "array-contains", uid)
  ));
  const convs = [];
  for (const d of snap.docs) {
    const data = d.data();
    const otherId = data.participants.find(p => p !== uid);
    const otherDoc = await window._getDoc(window._doc(db, "users", otherId));
    convs.push({ id: d.id, ...data, otherName: otherDoc.exists() ? otherDoc.data().fullName : "Inconnu", otherId });
  }
  convs.sort((a, b) => (b.lastAt?.seconds || 0) - (a.lastAt?.seconds || 0));
  const list = document.getElementById("conversations-list");
  if (!convs.length) {
    list.innerHTML = `<div class="empty-state" style="padding:2rem 1rem">Aucune conversation.<br><small style="color:var(--text-dim)">Cliquez sur "+ Nouveau" pour démarrer.</small></div>`;
    return;
  }
  list.innerHTML = convs.map(c => {
    const date = c.lastAt ? new Date(c.lastAt.seconds * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "";
    return `<div class="conv-item ${c.id === currentConvId ? "active" : ""}" onclick="openConversation('${c.id}','${c.otherName.replace(/'/g, "\\'")}','${c.otherId}')">
      <div style="overflow:hidden">
        <span class="conv-item-time">${date}</span>
        <div class="conv-item-name">${c.otherName}</div>
        <div class="conv-item-preview">${c.lastMessage || "—"}</div>
      </div>
    </div>`;
  }).join("");
}

function openConversation(convId, otherName, otherId) {
  currentConvId = convId;
  if (unsubscribeMessages) unsubscribeMessages();

  const panel = document.getElementById("chat-panel");
  panel.innerHTML = `
    <div class="chat-header">
      <button class="chat-back-btn" onclick="backToConvList()">←</button>
      <span style="flex:1;font-size:0.95rem">${otherName}</span>
    </div>
    <div class="chat-messages" id="chat-msgs"></div>
    <div class="chat-input-bar">
      <input type="text" id="chat-input" placeholder="Votre message..." onkeydown="if(event.key==='Enter')sendMessage('${convId}')"/>
      <button class="btn-primary btn-sm" onclick="sendMessage('${convId}')">↑</button>
    </div>`;

  // Mobile: cacher la liste
  if (window.innerWidth <= 768) {
    document.getElementById("conversations-list").style.display = "none";
    panel.style.display = "flex";
  }

  const q = window._query(
    window._collection(window._db, "conversations", convId, "messages"),
    window._orderBy("sentAt", "asc")
  );
  unsubscribeMessages = window._onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(d => msgs.push(d.data()));
    const container = document.getElementById("chat-msgs");
    if (!container) return;
    container.innerHTML = msgs.map(m => {
      const isMe = m.senderId === window._currentUser.uid;
      const time = m.sentAt ? new Date(m.sentAt.seconds * 1000).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "";
      return `<div style="display:flex;flex-direction:column;align-items:${isMe ? "flex-end" : "flex-start"}">
        <div class="chat-msg ${isMe ? "sent" : "received"}">${m.text}</div>
        <div style="font-size:0.7rem;color:var(--text-dim);margin:0 4px 4px;align-self:${isMe ? "flex-end" : "flex-start"}">${time}</div>
      </div>`;
    }).join("");
    container.scrollTop = container.scrollHeight;
  });

  loadConversations();
}

function backToConvList() {
  const panel = document.getElementById("chat-panel");
  if (window.innerWidth <= 768) {
    document.getElementById("conversations-list").style.display = "block";
    panel.style.display = "none";
    panel.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.9rem">Sélectionnez une conversation</div>`;
  }
}

async function sendMessage(convId) {
  const input = document.getElementById("chat-input");
  const text = input.value.trim();
  if (!text) return;
  input.value = "";
  const db = window._db;
  await window._addDoc(window._collection(db, "conversations", convId, "messages"), {
    senderId: window._currentUser.uid,
    senderName: window._currentUser.fullName,
    text,
    sentAt: window._serverTimestamp()
  });
  await window._updateDoc(window._doc(db, "conversations", convId), {
    lastMessage: text,
    lastAt: window._serverTimestamp()
  });
}

async function openNewMessage() {
  openModal("modal-new-msg");
}

async function sendNewMessage() {
  const recipientId = document.getElementById("msg-recipient").value;
  const body = document.getElementById("msg-body").value.trim();
  if (!recipientId || !body) {
    alert("Veuillez choisir un destinataire et écrire un message.");
    return;
  }
  const db = window._db, uid = window._currentUser.uid;
  // Chercher si conversation existante
  const snap = await window._getDocs(window._query(
    window._collection(db, "conversations"),
    window._where("participants", "array-contains", uid)
  ));
  let convId = null;
  snap.forEach(d => { if (d.data().participants.includes(recipientId)) convId = d.id; });

  if (!convId) {
    const ref = await window._addDoc(window._collection(db, "conversations"), {
      participants: [uid, recipientId],
      lastMessage: body,
      lastAt: window._serverTimestamp(),
      createdAt: window._serverTimestamp()
    });
    convId = ref.id;
  }
  await window._addDoc(window._collection(db, "conversations", convId, "messages"), {
    senderId: uid,
    senderName: window._currentUser.fullName,
    text: body,
    sentAt: window._serverTimestamp()
  });
  await window._updateDoc(window._doc(db, "conversations", convId), {
    lastMessage: body,
    lastAt: window._serverTimestamp()
  });
  closeModal("modal-new-msg");
  document.getElementById("msg-body").value = "";
  await loadConversations();
  const otherDoc = await window._getDoc(window._doc(db, "users", recipientId));
  openConversation(convId, otherDoc.data()?.fullName || "—", recipientId);
}

// ===== ANNONCES =====
async function loadAnnounces() {
  try {
    const snap = await window._getDocs(window._query(
      window._collection(window._db, "announces"),
      window._orderBy("createdAt", "desc")
    ));
    const anns = [];
    snap.forEach(d => anns.push({ id: d.id, ...d.data() }));
    const el = document.getElementById("announces-list");
    if (!anns.length) {
      el.innerHTML = `<div class="empty-state">📢 Aucune annonce pour le moment.</div>`;
      return;
    }
    el.innerHTML = anns.map(a => `
      <div class="announce-card">
        <div class="announce-title">${a.title}</div>
        <div class="announce-body">${a.body}</div>
        <div class="announce-meta">
          Par ${a.authorName || "—"} · ${a.createdAt ? new Date(a.createdAt.seconds * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""}
          ${(window._currentUser?.role === "admin" || window._currentUser?.role === "teacher") ?
            `<button class="btn-icon" style="float:right;color:var(--error)" onclick="deleteAnnounce('${a.id}')">🗑</button>` : ""}
        </div>
      </div>`).join("");
  } catch (e) { console.error("loadAnnounces:", e); }
}

async function publishAnnounce() {
  const title = document.getElementById("ann-title").value.trim();
  const body = document.getElementById("ann-body").value.trim();
  if (!title || !body) { alert("Titre et contenu obligatoires."); return; }
  await window._addDoc(window._collection(window._db, "announces"), {
    title, body,
    authorId: window._currentUser.uid,
    authorName: window._currentUser.fullName,
    createdAt: window._serverTimestamp()
  });
  document.getElementById("ann-title").value = "";
  document.getElementById("ann-body").value = "";
  toggleAnnounceForm();
  loadAnnounces();
}

async function deleteAnnounce(id) {
  if (!confirm("Supprimer cette annonce ?")) return;
  // Need deleteDoc — import it via window if available, otherwise use a workaround
  try {
    const db = window._db;
    // Use updateDoc to mark as deleted if deleteDoc not imported
    // Actually just reload after trying
    const { deleteDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(doc(db, "announces", id));
    loadAnnounces();
  } catch(e) { console.error(e); }
}
