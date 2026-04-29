import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("actividades")
        .select("*");

      if (error) throw error;

      return res.status(200).json(data);
    }

    if (req.method === "POST") {
      const body = req.body;

      const { data, error } = await supabase
        .from("actividades")
        .insert(body);

      if (error) throw error;

      return res.status(200).json(data);
    }

    res.status(405).json({ error: "Método no permitido" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error servidor" });
  }
}