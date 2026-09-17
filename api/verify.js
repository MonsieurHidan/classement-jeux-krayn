export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }
  const password = req.headers["x-admin-password"];
  const ok = Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
  res.status(ok ? 200 : 401).json({ ok });
}
