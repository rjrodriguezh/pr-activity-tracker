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

    const { semanaInicio, semanaFin, descripcion } = req.body;

    const { data, error } = await supabase
      .from("notas_semana")
      .insert([
        {
          semana_inicio: semanaInicio,
          semana_fin: semanaFin,
          descripcion,
          estado: "activo",
        },
      ]);

    if (error) {
      console.error("SUPABASE ERROR:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, data });

  } catch (err) {
    console.error("ERROR GENERAL:", err);
    return res.status(500).json({ error: err.message });
  }
}