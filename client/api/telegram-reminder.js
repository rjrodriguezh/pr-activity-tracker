// trigger deploy
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

function fechaOffset(dias) {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + dias);
  return fecha.toISOString().slice(0, 10);
}

async function obtenerActividades(fecha) {
  const { data, error } = await supabase
    .from("actividades")
    .select("*")
    .eq("fecha", fecha)
    .order("id", { ascending: true });

  if (error) throw error;
  return data || [];
}

function escaparHtml(texto) {
  return String(texto || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatearActividades(titulo, fecha, actividades) {
  if (!actividades.length) {
    return `<b>${titulo} (${fecha})</b>\nSin actividades registradas.`;
  }

  const detalle = actividades
    .map((a, i) => {
      return `${i + 1}) <b>${escaparHtml(a.actividad || a.asignatura_relacionada)}</b>
<b>Asignatura:</b> ${escaparHtml(a.asignatura_relacionada)}
<b>Observaciones:</b> ${escaparHtml(a.observaciones)}`;
    })
    .join("\n\n");

  return `<b>${titulo} (${fecha})</b>\n${detalle}`;
}

async function enviarTelegram(mensaje) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: mensaje,
      parse_mode: "HTML",
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }

  return data;
}

export default async function handler(req, res) {
  try {
    const manana = fechaOffset(1);
    const pasadoManana = fechaOffset(2);

    const actividadesManana = await obtenerActividades(manana);
    const actividadesPasado = await obtenerActividades(pasadoManana);

    const mensaje = `📚 <b>Recordatorio escolar automático</b>\n\n${formatearActividades(
      "✅ Mañana",
      manana,
      actividadesManana
    )}\n\n${formatearActividades(
      "✅ Pasado mañana",
      pasadoManana,
      actividadesPasado
    )}`;

    await enviarTelegram(mensaje);

    return res.status(200).json({ ok: true, enviado: true });
  } catch (error) {
    console.error("Error telegram reminder:", error);
    return res.status(500).json({ error: error.message });
  }
}