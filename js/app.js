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

function linkLabel(url) {
  try {
    return new URL(url).host.includes("steampowered") ? "Voir sur Steam" : "Plus d'infos";
  } catch {
    return "Plus d'infos";
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
            ${
              game.steamUrl
                ? `<a class="steam-link" href="${escapeHtml(game.steamUrl)}" target="_blank" rel="noopener">${linkLabel(game.steamUrl)}</a>`
                : ""
            }
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
