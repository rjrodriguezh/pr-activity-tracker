require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const { responderConsulta } = require("./chatService");

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  throw new Error("Falta TELEGRAM_BOT_TOKEN en el archivo .env");
}

const bot = new TelegramBot(token, { polling: true });

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const texto = msg.text;

  if (!texto) {
    await bot.sendMessage(chatId, "Solo puedo responder mensajes de texto por ahora.");
    return;
  }

  try {
    const respuesta = responderConsulta(texto);

    // 👇 SOLO UNA RESPUESTA (antes tenías 2, eso estaba mal)
    await bot.sendMessage(chatId, respuesta, {
      parse_mode: "HTML"
    });

  } catch (error) {
    console.error("Error respondiendo en Telegram:", error);
    await bot.sendMessage(chatId, "Ocurrió un error procesando tu mensaje.");
  }
});

console.log("🤖 Bot de Telegram corriendo...");