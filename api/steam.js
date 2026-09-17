const FR_MONTHS = {
  janv: "01", fevr: "02", mars: "03", avr: "04", mai: "05", juin: "06",
  juil: "07", aout: "08", sept: "09", oct: "10", nov: "11", dec: "12",
};

function stripAccents(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function extractAppId(input) {
  const match = String(input).match(/\/app\/(\d+)/) || String(input).match(/^(\d+)$/);
  return match ? match[1] : null;
}

function parseFrenchDate(str) {
  const parts = String(str).trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [day, monRaw, year] = parts;
  const key = stripAccents(monRaw.replace(/\.$/, "").toLowerCase());
  const monthNum = FR_MONTHS[key];
  if (!monthNum || !/^\d{4}$/.test(year)) return null;
  return `${year}-${monthNum}-${day.padStart(2, "0")}`;
}

async function fetchAppDetails(appid, lang) {
  const r = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appid}&l=${lang}`);
  const payload = await r.json();
  const entry = payload[appid];
  return entry && entry.success ? entry.data : null;
}

async function translateToFrench(text) {
  if (!text) return text;
  try {
    const r = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|fr`
    );
    const data = await r.json();
    return data?.responseData?.translatedText || text;
  } catch {
    return text;
  }
}

export default async function handler(req, res) {
  const input = req.query.url || req.query.appid;
  const appid = extractAppId(input);

  if (!appid) {
    return res.status(400).json({ error: "Lien Steam invalide, impossible d'en extraire l'appid." });
  }

  try {
    const [frData, enData] = await Promise.all([
      fetchAppDetails(appid, "french"),
      fetchAppDetails(appid, "english"),
    ]);
    const d = frData || enData;

    if (!d) {
      return res.status(404).json({ error: "Jeu introuvable sur Steam." });
    }

    const frDesc = frData?.short_description?.trim();
    const enDesc = enData?.short_description?.trim();
    let description = frDesc || enDesc || "";
    let translated = false;
    if (frDesc && enDesc && frDesc.toLowerCase() === enDesc.toLowerCase()) {
      description = await translateToFrench(enDesc);
      translated = true;
    } else if (!frDesc && enDesc) {
      description = await translateToFrench(enDesc);
      translated = true;
    }

    const genres = (d.genres || []).map((g) => g.description).join(", ");
    const rawDate = d.release_date?.date || "";
    const dateSortieRaw = rawDate ? parseFrenchDate(rawDate) : null;

    res.status(200).json({
      appid,
      titre: d.name,
      image: d.header_image,
      genre: genres,
      dateSortie: rawDate,
      dateSortieRaw,
      description,
      descriptionTraduite: translated,
      steamUrl: `https://store.steampowered.com/app/${appid}/`,
    });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la récupération des données Steam." });
  }
}
