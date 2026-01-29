async function sendDiscord(text) {
  const url = process.env.DISCORD_WEBHOOK_URL;
  if (!url) return false;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text })
  });
  return res.ok;
}

async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true })
  });
  return res.ok;
}

async function notify(text) {
  const enabled = (process.env.ALERTS_ENABLED || "false").toLowerCase() === "true";
  if (!enabled) return;

  const d = (process.env.ALERTS_DISCORD_ENABLED || "false").toLowerCase() === "true";
  const t = (process.env.ALERTS_TELEGRAM_ENABLED || "false").toLowerCase() === "true";

  if (d) await sendDiscord(text);
  if (t) await sendTelegram(text);
}

module.exports = { notify };
