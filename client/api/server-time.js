export default async function handler(req, res) {
  const now = new Date();

  return res.status(200).json({
    utc: now.toISOString(),
    chile: now.toLocaleString("es-CL", {
      timeZone: "America/Santiago",
      hour12: false,
    }),
  });
}