const GENRES_FR = {
  Action: "Action",
  Indie: "Indépendant",
  RPG: "RPG",
  Adventure: "Aventure",
  Horror: "Horreur",
  "Early Access": "Accès anticipé",
  Simulation: "Simulation",
  Strategy: "Stratégie",
  Casual: "Décontracté",
  Racing: "Course",
  Sports: "Sport",
  "Massively Multiplayer": "Multijoueur de masse",
  "Free To Play": "Gratuit",
  "Action RPG": "Action RPG",
};

const MONTHS_FR = {
  Jan: "janv.", Feb: "févr.", Mar: "mars", Apr: "avr.", May: "mai", Jun: "juin",
  Jul: "juil.", Aug: "août", Sep: "sept.", Oct: "oct.", Nov: "nov.", Dec: "déc.",
};

function extractAppId(input) {
  const match = String(input).match(/\/app\/(\d+)/) || String(input).match(/^(\d+)$/);
  return match ? match[1] : null;
}

function frenchDate(rawDate) {
  const match = rawDate.match(/^(\d{1,2}) (\w{3}),? (\d{4})$/);
  if (!match) return { display: rawDate, iso: null };
  const [, day, monEn, year] = match;
  const monthIndex = Object.keys(MONTHS_FR).indexOf(monEn);
  if (monthIndex === -1) return { display: rawDate, iso: null };
  const monthNum = String(monthIndex + 1).padStart(2, "0");
  const dayNum = day.padStart(2, "0");
  return {
    display: `${day} ${MONTHS_FR[monEn]} ${year}`,
    iso: `${year}-${monthNum}-${dayNum}`,
  };
}

export default async function handler(req, res) {
  const input = req.query.url || req.query.appid;
  const appid = extractAppId(input);

  if (!appid) {
    return res.status(400).json({ error: "Lien Steam invalide, impossible d'en extraire l'appid." });
  }

  try {
    const steamRes = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appid}&l=english`
    );
    const payload = await steamRes.json();
    const entry = payload[appid];

    if (!entry || !entry.success) {
      return res.status(404).json({ error: "Jeu introuvable sur Steam." });
    }

    const d = entry.data;
    const genres = (d.genres || [])
      .map((g) => GENRES_FR[g.description] || g.description)
      .join(", ");
    const { display, iso } = d.release_date?.date
      ? frenchDate(d.release_date.date)
      : { display: "", iso: null };

    res.status(200).json({
      appid,
      titre: d.name,
      image: d.header_image,
      genre: genres,
      dateSortie: display,
      dateSortieRaw: iso,
      description: d.short_description || "",
      steamUrl: `https://store.steampowered.com/app/${appid}/`,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des données Steam." });
  }
}
