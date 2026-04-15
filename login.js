async function handleLogin() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const errEl = document.getElementById("login-error");
  const btn = document.getElementById("login-btn");
  errEl.classList.add("hidden");
  if (!username || !password) { errEl.textContent = "Veuillez remplir tous les champs."; errEl.classList.remove("hidden"); return; }
  btn.disabled = true; btn.textContent = "Connexion...";
  try {
    const email = username.includes("@") ? username : username + "@edupro.app";
    const cred = await window._signIn(window._auth, email, password);
    const userDoc = await window._getDoc(window._doc(window._db, "users", cred.user.uid));
    if (userDoc.exists()) {
      const role = userDoc.data().role;
      if (role === "admin" || role === "teacher") window.location.href = "admin.html";
      else if (role === "parent") window.location.href = "parent.html";
      else window.location.href = "dashboard.html";
    } else {
      errEl.textContent = "Compte non trouvé. Contactez votre administrateur.";
      errEl.classList.remove("hidden");
      window._auth.signOut();
    }
  } catch (err) {
    let msg = "Identifiant ou mot de passe incorrect.";
    if (err.code === "auth/too-many-requests") msg = "Trop de tentatives. Réessayez plus tard.";
    errEl.textContent = msg; errEl.classList.remove("hidden");
  }
  btn.disabled = false; btn.textContent = "Se connecter";
}
document.addEventListener("keydown", e => { if (e.key === "Enter") handleLogin(); });
