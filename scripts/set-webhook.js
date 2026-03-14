/**
 * Run once after deploying to Vercel to register your webhook URL.
 * Usage:
 *   TELEGRAM_BOT_TOKEN=xxx VERCEL_URL=https://your-app.vercel.app node scripts/set-webhook.js
 */

const https = require("https");

const token = process.env.TELEGRAM_BOT_TOKEN;
const url = process.env.VERCEL_URL; // e.g. https://your-app.vercel.app

if (!token || !url) {
  console.error("❌  Set TELEGRAM_BOT_TOKEN and VERCEL_URL environment variables first.");
  process.exit(1);
}

const webhookUrl = `${url}/webhook`;
const apiUrl = `https://api.telegram.org/bot${token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`;

https.get(apiUrl, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    const json = JSON.parse(data);
    if (json.ok) {
      console.log(`✅  Webhook set to: ${webhookUrl}`);
    } else {
      console.error("❌  Failed:", json);
    }
  });
}).on("error", console.error);
