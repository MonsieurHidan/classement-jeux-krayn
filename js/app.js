const grid = document.getElementById("grid");
const buttons = document.querySelectorAll(".controls button");
let GAMES = [];

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function noteColor(note) {
  const pct = Math.max(0, Math.min(1, note / 20));
  const hue = pct * 130; // 0 = rouge, ~65 = orange/jaune, 130 = vert
  return `hsl(${hue.toFixed(0)}, 75%, 55%)`;
}

function rankClass(index) {
  if (index === 0) return "gold";
  if (index === 1) return "silver";
  if (index === 2) return "bronze";
  return "";
}

const STEAM_ICON = `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.6"/><circle cx="9" cy="15" r="2.2" fill="currentColor"/><path d="M9 15L14 10" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="15" cy="9" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>`;
const YOUTUBE_ICON = `<svg viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="4" fill="currentColor"/><path d="M10 8.7L16 12L10 15.3V8.7Z" fill="#fff"/></svg>`;
const EXTERNAL_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M20 4L10 14M18 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2h5"/></svg>`;

function linkMeta(url) {
  try {
    const isSteam = new URL(url).host.includes("steampowered");
    return isSteam
      ? { className: "link-steam", icon: STEAM_ICON, title: "Voir sur Steam" }
      : { className: "link-external", icon: EXTERNAL_ICON, title: "Plus d'infos" };
  } catch {
    return { className: "link-external", icon: EXTERNAL_ICON, title: "Plus d'infos" };
  }
}

function render(games) {
  if (!games.length) {
    grid.innerHTML = `<p class="empty">Aucun jeu ajouté pour le moment.</p>`;
    return;
  }

  const maxNote = Math.max(...games.map((g) => g.note));

  grid.innerHTML = games
    .map((game, i) => {
      const isBest = game.note === maxNote;
      const position = escapeHtml(game.imagePosition || "50% 50%");
      return `
      <article class="card">
        <div class="rank ${rankClass(i)}">${i + 1}</div>
        <div class="cover-wrap">
          ${
            game.image
              ? `<img class="cover" src="${escapeHtml(game.image)}" alt="${escapeHtml(game.titre)}" style="object-position: ${position}" loading="lazy" />`
              : `<div class="cover cover-placeholder">${escapeHtml((game.titre || "?").charAt(0).toUpperCase())}</div>`
          }
          <div class="cover-fade"></div>
        </div>
        <div class="card-body">
          <h2>${escapeHtml(game.titre)}</h2>
          <div class="meta">
            ${(game.genre || "").split(",").filter(Boolean).map((g) => `<span>${escapeHtml(g.trim())}</span>`).join("")}
            ${game.dateSortie ? `<span>${escapeHtml(game.dateSortie)}</span>` : ""}
          </div>
          ${game.description ? `<p class="description">${escapeHtml(game.description)}</p>` : ""}
          <div class="card-footer">
            <div class="note ${isBest ? "note-best" : ""}" style="${isBest ? "" : `color: ${noteColor(game.note)}`}">${isBest ? "★ " : ""}${Number(game.note).toFixed(1)}<small>/20 chat</small></div>
            <div class="links">
              ${
                game.steamUrl
                  ? (() => {
                      const link = linkMeta(game.steamUrl);
                      return `<a class="link-btn ${link.className}" href="${escapeHtml(game.steamUrl)}" target="_blank" rel="noopener" title="${link.title}" aria-label="${link.title}">${link.icon}</a>`;
                    })()
                  : ""
              }
              ${
                game.vodUrl
                  ? `<a class="link-btn link-youtube" href="${escapeHtml(game.vodUrl)}" target="_blank" rel="noopener" title="Voir la VOD" aria-label="Voir la VOD">${YOUTUBE_ICON}</a>`
                  : ""
              }
            </div>
          </div>
        </div>
      </article>
    `;
    })
    .join("");
}

function sortGames(mode) {
  const games = [...GAMES];
  if (mode === "note") games.sort((a, b) => b.note - a.note);
  if (mode === "date") games.sort((a, b) => new Date(b.dateSortieRaw || 0) - new Date(a.dateSortieRaw || 0));
  if (mode === "az") games.sort((a, b) => a.titre.localeCompare(b.titre));
  render(games);
}

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    sortGames(btn.dataset.sort);
  });
});

async function init() {
  try {
    const res = await fetch("/api/games");
    if (!res.ok) throw new Error("api unavailable");
    GAMES = await res.json();
  } catch {
    GAMES = typeof SEED_GAMES !== "undefined" ? SEED_GAMES : [];
  }
  sortGames(document.querySelector(".controls button.active")?.dataset.sort || "note");
}

init();
