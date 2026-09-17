import { kv } from "@vercel/kv";
import { SEED_GAMES } from "./_seed.js";

function slugify(str) {
  return (
    str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "jeu"
  );
}

function isAuthorized(req) {
  const password = req.headers["x-admin-password"];
  return Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const games = (await kv.get("games")) ?? SEED_GAMES;
    return res.status(200).json(games);
  }

  if (req.method === "POST") {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }
    const body = req.body || {};
    if (!body.titre || !body.steamUrl || typeof body.note !== "number") {
      return res.status(400).json({ error: "Titre, lien Steam et note sont requis." });
    }

    const games = (await kv.get("games")) ?? SEED_GAMES;
    const newGame = {
      id: `${slugify(body.titre)}-${Date.now().toString(36)}`,
      titre: body.titre,
      steamUrl: body.steamUrl,
      image: body.image || "",
      note: body.note,
      genre: body.genre || "",
      dateSortie: body.dateSortie || "",
      dateSortieRaw: body.dateSortieRaw || null,
      description: body.description || "",
    };
    const updated = [...games, newGame];
    await kv.set("games", updated);
    return res.status(201).json(newGame);
  }

  if (req.method === "DELETE") {
    if (!isAuthorized(req)) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }
    const { id } = req.query;
    const games = (await kv.get("games")) ?? SEED_GAMES;
    const updated = games.filter((g) => g.id !== id);
    await kv.set("games", updated);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  res.status(405).end();
}
