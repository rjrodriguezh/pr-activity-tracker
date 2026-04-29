import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      return res.status(500).json({
        error: "Faltan variables SUPABASE_URL o SUPABASE_KEY en Vercel",
      });
    }

    const { semanaInicio, semanaFin, descripcion } = req.body;

    if (!semanaInicio || !semanaFin) {
      return res.status(400).json({
        error: "Faltan semanaInicio o semanaFin",
        body: req.body,
      });
    }

    const { data, error } = await supabase
      .from("notas_semana")
      .insert([
        {
          id: Date.now(),
          semana_inicio: semanaInicio,
          semana_fin: semanaFin,
          descripcion: descripcion || "",
          estado: "borrador",
          texto_extraido: "",
        },
      ])
      .select("*");

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
    }

    return res.status(200).json({
      ok: true,
      data,
    });
  } catch (err) {
    console.error("ERROR GENERAL:", err);
    return res.status(500).json({
      error: err.message || "Error inesperado",
    });
  }
}