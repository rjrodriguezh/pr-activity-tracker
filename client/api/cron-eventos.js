import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("cron_eventos")
        .select("*")
        .order("hora_chile", { ascending: true });

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const { nombre, hora_chile, activo, tipo, descripcion } = req.body;

      const { data, error } = await supabase
        .from("cron_eventos")
        .insert([
          {
            nombre,
            hora_chile,
            activo: activo ?? true,
            tipo: tipo || "telegram-reminder",
            descripcion: descripcion || "",
          },
        ])
        .select("*");

      if (error) throw error;
      return res.status(201).json(data[0]);
    }

    if (req.method === "PUT") {
      const { id, nombre, hora_chile, activo, tipo, descripcion } = req.body;

      const { data, error } = await supabase
        .from("cron_eventos")
        .update({
          nombre,
          hora_chile,
          activo,
          tipo,
          descripcion,
        })
        .eq("id", id)
        .select("*");

      if (error) throw error;
      return res.status(200).json(data[0]);
    }

    if (req.method === "DELETE") {
      const { id } = req.query;

      const { error } = await supabase
        .from("cron_eventos")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Método no permitido" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}