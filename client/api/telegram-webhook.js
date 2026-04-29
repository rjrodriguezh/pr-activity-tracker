//funciona
export default async function handler(req, res) {
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    console.log("Webhook:", body);

    if (!body.message) {
      return res.status(200).json({ ok: true });
    }

    const chatId = body.message.chat.id;
    const texto = body.message.text;

    console.log("Texto:", texto);

    const response = await fetch("https://pr-activity-tracker.vercel.app/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mensaje: texto }),
    });

    const data = await response.json();

    await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: data.respuesta || "Sin respuesta",
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("ERROR WEBHOOK:", error);
    return res.status(200).json({ ok: true });
  }
}