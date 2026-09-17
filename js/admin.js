const STORAGE_KEY = "krayn_admin_password";

const loginPanel = document.getElementById("login-panel");
const adminPanel = document.getElementById("admin-panel");
const passwordInput = document.getElementById("password-input");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");

const steamUrlInput = document.getElementById("steam-url");
const fetchBtn = document.getElementById("fetch-btn");
const fetchError = document.getElementById("fetch-error");

const preview = document.getElementById("preview");
const previewImage = document.getElementById("preview-image");
const fieldTitre = document.getElementById("field-titre");
const fieldNote = document.getElementById("field-note");
const fieldGenre = document.getElementById("field-genre");
const fieldDate = document.getElementById("field-date");
const fieldDescription = document.getElementById("field-description");
const addBtn = document.getElementById("add-btn");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const addError = document.getElementById("add-error");
const addSuccess = document.getElementById("add-success");

const gamesList = document.getElementById("games-list");

let currentAppData = null;
let editingId = null;
let gamesCache = [];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function getPassword() {
  return localStorage.getItem(STORAGE_KEY) || "";
}

async function verifyPassword(password) {
  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "x-admin-password": password },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function showAdminIfAuthorized() {
  const saved = getPassword();
  if (!saved) return;
  const ok = await verifyPassword(saved);
  if (ok) {
    loginPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    loadGamesList();
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}

loginBtn.addEventListener("click", async () => {
  loginError.textContent = "";
  const password = passwordInput.value;
  if (!password) return;
  loginBtn.disabled = true;
  const ok = await verifyPassword(password);
  loginBtn.disabled = false;
  if (ok) {
    localStorage.setItem(STORAGE_KEY, password);
    loginPanel.classList.add("hidden");
    adminPanel.classList.remove("hidden");
    loadGamesList();
  } else {
    loginError.textContent = "Mot de passe incorrect.";
  }
});

passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

fetchBtn.addEventListener("click", async () => {
  fetchError.textContent = "";
  const url = steamUrlInput.value.trim();
  if (!url) return;
  fetchBtn.disabled = true;
  fetchBtn.textContent = "Recherche...";
  try {
    const res = await fetch(`/api/steam?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur");
    currentAppData = data;
    previewImage.src = data.image;
    fieldTitre.value = data.titre;
    fieldGenre.value = data.genre;
    fieldDate.value = data.dateSortie;
    fieldDescription.value = data.description;
    fieldNote.value = "";
    preview.classList.remove("hidden");
    addError.textContent = "";
    addSuccess.textContent = "";
  } catch (err) {
    fetchError.textContent = err.message || "Impossible de récupérer les infos Steam.";
    preview.classList.add("hidden");
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = "Chercher";
  }
});

function enterEditMode(game) {
  editingId = game.id;
  currentAppData = { steamUrl: game.steamUrl, dateSortieRaw: game.dateSortieRaw };
  steamUrlInput.value = game.steamUrl;
  previewImage.src = game.image;
  fieldTitre.value = game.titre;
  fieldNote.value = game.note;
  fieldGenre.value = game.genre;
  fieldDate.value = game.dateSortie;
  fieldDescription.value = game.description;
  preview.classList.remove("hidden");
  addBtn.textContent = "Enregistrer les modifications";
  cancelEditBtn.classList.remove("hidden");
  addError.textContent = "";
  addSuccess.textContent = "";
  preview.scrollIntoView({ behavior: "smooth", block: "start" });
}

function exitEditMode() {
  editingId = null;
  currentAppData = null;
  steamUrlInput.value = "";
  preview.classList.add("hidden");
  addBtn.textContent = "Ajouter au classement";
  cancelEditBtn.classList.add("hidden");
  addError.textContent = "";
  addSuccess.textContent = "";
}

cancelEditBtn.addEventListener("click", exitEditMode);

addBtn.addEventListener("click", async () => {
  addError.textContent = "";
  addSuccess.textContent = "";
  const note = parseFloat(fieldNote.value);
  if (!fieldTitre.value.trim()) {
    addError.textContent = "Le titre est requis.";
    return;
  }
  if (Number.isNaN(note)) {
    addError.textContent = "Entre la note donnée par le chat.";
    return;
  }

  const payload = {
    titre: fieldTitre.value.trim(),
    steamUrl: currentAppData?.steamUrl || steamUrlInput.value.trim(),
    image: previewImage.src,
    note,
    genre: fieldGenre.value.trim(),
    dateSortie: fieldDate.value.trim(),
    dateSortieRaw: currentAppData?.dateSortieRaw || null,
    description: fieldDescription.value.trim(),
  };

  addBtn.disabled = true;
  try {
    const res = await fetch("/api/games", {
      method: editingId ? "PATCH" : "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": getPassword(),
      },
      body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur.");
    addSuccess.textContent = editingId ? `"${data.titre}" modifié !` : `"${data.titre}" ajouté au classement !`;
    exitEditMode();
    loadGamesList();
  } catch (err) {
    addError.textContent = err.message;
  } finally {
    addBtn.disabled = false;
  }
});

async function loadGamesList() {
  const res = await fetch("/api/games");
  gamesCache = await res.json();
  if (!gamesCache.length) {
    gamesList.innerHTML = `<p class="error-text" style="color: var(--text-muted)">Aucun jeu pour le moment.</p>`;
    return;
  }
  gamesList.innerHTML = gamesCache
    .map(
      (g) => `
      <div class="game-row" data-id="${escapeHtml(g.id)}">
        <img src="${escapeHtml(g.image)}" alt="" />
        <div class="info">
          <div class="title">${escapeHtml(g.titre)}</div>
          <div class="sub">${Number(g.note)}/20 · ${escapeHtml(g.genre || "")}</div>
        </div>
        <button class="edit-btn" data-id="${escapeHtml(g.id)}">Modifier</button>
        <button class="delete-btn" data-id="${escapeHtml(g.id)}">Supprimer</button>
      </div>
    `
    )
    .join("");

  gamesList.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const game = gamesCache.find((g) => g.id === btn.dataset.id);
      if (game) enterEditMode(game);
    });
  });

  gamesList.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (!confirm("Supprimer ce jeu du classement ?")) return;
      btn.disabled = true;
      await fetch(`/api/games?id=${encodeURIComponent(btn.dataset.id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": getPassword() },
      });
      if (editingId === btn.dataset.id) exitEditMode();
      loadGamesList();
    });
  });
}

showAdminIfAuthorized();
