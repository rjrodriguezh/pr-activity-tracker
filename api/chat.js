import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function fechaISO(fecha) {
  return fecha.toISOString().slice(0, 10);
}

function detectarFecha(texto) {
  const t = String(texto || "").toLowerCase();

  const directa = t.match(/\d{4}-\d{2}-\d{2}/);
  if (directa) return directa[0];

  const hoy = new Date();

  if (t.includes("pasado mañana")) {
    hoy.setDate(hoy.getDate() + 2);
    return fechaISO(hoy);
  }

  if (t.includes("mañana")) {
    hoy.setDate(hoy.getDate() + 1);
    return fechaISO(hoy);
  }

  if (t.includes("ayer")) {
    hoy.setDate(hoy.getDate() - 1);
    return fechaISO(hoy);
  }

  if (t.includes("hoy")) {
    return fechaISO(hoy);
  }

  return null;
}

function responderActividades(fecha, actividades) {
  if (!actividades.length) {
    return `No hay actividades registradas para ${fecha}.`;
  }

  return `Para ${fecha} hay ${actividades.length} actividad(es):\n\n` +
    actividades
      .map((a, i) => {
        return `${i + 1}) ${a.actividad || a.asignatura_relacionada}
Asignatura: ${a.asignatura_relacionada || "sin asignatura"}
Observaciones: ${a.observaciones || "sin observaciones"}`;
      })
      .join("\n\n");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método no permitido" });
    }

    const { mensaje } = req.body;
    const fecha = detectarFecha(mensaje);

    if (!fecha) {
      return res.status(200).json({
        respuesta:
          "Puedes preguntarme: ¿qué hay hoy?, ¿qué hay mañana?, ¿qué hay ayer? o una fecha como 2026-04-27.",
      });
    }

    const { data, error } = await supabase
      .from("actividades")
      .select("*")
      .eq("fecha", fecha)
      .order("id", { ascending: true });

    if (error) throw error;

    return res.status(200).json({
      respuesta: responderActividades(fecha, data || []),
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Error en chat",
    });
  }
}