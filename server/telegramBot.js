require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.TELEGRAM_BOT_TOKEN;
const API_URL = "https://pr-activity-tracker.vercel.app";

if (!token) {
  throw new Error("Falta TELEGRAM_BOT_TOKEN en .env");
}

const bot = new TelegramBot(token, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  if (!texto) {
    await bot.sendMessage(chatId, "Solo puedo responder mensajes de texto.");
    return;
  }

  try {
    console.log("Mensaje Telegram:", texto);

    const response = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ mensaje: texto }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error API chat");
    }

    await bot.sendMessage(chatId, data.respuesta || "No encontré respuesta.");
  } catch (error) {
    console.error("Error Telegram:", error);
    await bot.sendMessage(chatId, "No pude consultar la información.");
  }
});

console.log("Bot de Telegram corriendo...");