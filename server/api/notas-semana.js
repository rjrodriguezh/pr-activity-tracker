import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    try {
      if (err) throw err;

      return res.status(200).json({
        mensaje: "Endpoint activo en Vercel",
        fields,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error en serverless" });
    }
  });
}