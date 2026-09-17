import { checkPassword } from "./_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const { ok, locked } = await checkPassword(req);
  if (locked) {
    return res.status(429).json({ ok: false, error: "Trop de tentatives, réessaie dans quelques minutes." });
  }
  res.status(ok ? 200 : 401).json({ ok });
}
