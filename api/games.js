import { Redis } from "@upstash/redis";
import { SEED_GAMES } from "./_seed.js";
import { checkPassword } from "./_auth.js";

const kv = Redis.fromEnv();

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

export default async function handler(req, res) {
  if (req.method === "GET") {
    const games = (await kv.get("games")) ?? SEED_GAMES;
    return res.status(200).json(games);
  }

  if (req.method === "POST") {
    const { ok, locked } = await checkPassword(req);
    if (locked) {
      return res.status(429).json({ error: "Trop de tentatives, réessaie dans quelques minutes." });
    }
    if (!ok) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }
    const body = req.body || {};
    if (!body.titre || typeof body.note !== "number") {
      return res.status(400).json({ error: "Titre et note sont requis." });
    }

    const games = (await kv.get("games")) ?? SEED_GAMES;
    const newGame = {
      id: `${slugify(body.titre)}-${Date.now().toString(36)}`,
      titre: body.titre,
      steamUrl: body.steamUrl || "",
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

  if (req.method === "PATCH") {
    const { ok, locked } = await checkPassword(req);
    if (locked) {
      return res.status(429).json({ error: "Trop de tentatives, réessaie dans quelques minutes." });
    }
    if (!ok) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }
    const body = req.body || {};
    if (!body.id) {
      return res.status(400).json({ error: "id manquant." });
    }

    const games = (await kv.get("games")) ?? SEED_GAMES;
    const index = games.findIndex((g) => g.id === body.id);
    if (index === -1) {
      return res.status(404).json({ error: "Jeu introuvable." });
    }

    const updatedGame = {
      ...games[index],
      titre: body.titre ?? games[index].titre,
      steamUrl: body.steamUrl ?? games[index].steamUrl,
      image: body.image ?? games[index].image,
      note: typeof body.note === "number" ? body.note : games[index].note,
      genre: body.genre ?? games[index].genre,
      dateSortie: body.dateSortie ?? games[index].dateSortie,
      dateSortieRaw: body.dateSortieRaw ?? games[index].dateSortieRaw,
      description: body.description ?? games[index].description,
    };
    const updated = [...games];
    updated[index] = updatedGame;
    await kv.set("games", updated);
    return res.status(200).json(updatedGame);
  }

  if (req.method === "DELETE") {
    const { ok, locked } = await checkPassword(req);
    if (locked) {
      return res.status(429).json({ error: "Trop de tentatives, réessaie dans quelques minutes." });
    }
    if (!ok) {
      return res.status(401).json({ error: "Mot de passe incorrect." });
    }
    const { id } = req.query;
    const games = (await kv.get("games")) ?? SEED_GAMES;
    const updated = games.filter((g) => g.id !== id);
    await kv.set("games", updated);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST, PATCH, DELETE");
  res.status(405).end();
}
