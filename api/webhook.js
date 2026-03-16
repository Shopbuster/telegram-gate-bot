const TelegramBot = require("node-telegram-bot-api");
const {
  generateInviteLinks,
  getPendingChallenge,
  setPendingChallenge,
  deletePendingChallenge,
  getCooldownRemaining,
  setCooldown,
} = require("../lib/store");

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

function randomAddition() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { a, b, answer: a + b };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(200).send("Bot is running ✅");

  try {
    const update = req.body;

    // ── /start ────────────────────────────────────────────────────────────────
    if (update.message?.text?.startsWith("/start")) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const firstName = update.message.from.first_name || "there";

      const challenge = randomAddition();
      setPendingChallenge(userId, challenge);

      await bot.sendMessage(
        chatId,
        `👋 Hey ${firstName}! To get access to our private channels, please solve this quick verification:\n\n` +
          `🔢 What is ${challenge.a} + ${challenge.b}?\n\n` +
          `Just reply with the number.`
      );
    }

    // ── answer attempt ────────────────────────────────────────────────────────
    else if (update.message?.text && !update.message.text.startsWith("/")) {
      const chatId = update.message.chat.id;
      const userId = update.message.from.id;
      const text = update.message.text.trim();

      const challenge = getPendingChallenge(userId);
      if (!challenge) {
        await bot.sendMessage(chatId, "Please use /start to begin the verification process.");
        return res.status(200).end();
      }

      // ── cooldown check ──────────────────────────────────────────────────────
      const remainingMs = getCooldownRemaining(userId);
      if (remainingMs > 0) {
        const secs = Math.ceil(remainingMs / 1000);
        await bot.sendMessage(
          chatId,
          `⏳ Please wait ${secs} second${secs !== 1 ? "s" : ""} before trying again.`
        );
        return res.status(200).end();
      }

      const userAnswer = parseInt(text, 10);
      if (isNaN(userAnswer)) {
        await bot.sendMessage(chatId, "⚠️ Please enter a number only.");
        return res.status(200).end();
      }

      // ── correct ─────────────────────────────────────────────────────────────
      if (userAnswer === challenge.answer) {
        deletePendingChallenge(userId);

        try {
          const [link1, link2] = await generateInviteLinks(bot);

          let message =
            `✅ Correct! Welcome aboard!\n\n` +
            `Here are your private access links (each valid for 1 use only):\n\n` +
            `🔗 Homo Sapiens Services: ${link1}`;

          if (link2) {
            message += `\n\n🔗 Homo Sapiens Store: ${link2}`;
          }

          message += `\n\nThese links are unique to you — do not share them.`;

          await bot.sendMessage(chatId, message);
        } catch (linkErr) {
          console.error("generateInviteLinks failed:", linkErr);
          await bot.sendMessage(
            chatId,
            `✅ You answered correctly!\n\n` +
              `⚠️ However, I could not generate your invite link.\n` +
              `Reason: ${linkErr.message}\n\n` +
              `Please contact the admin.`
          );
        }

      // ── wrong ────────────────────────────────────────────────────────────────
      } else {
        setCooldown(userId);
        const newChallenge = randomAddition();
        setPendingChallenge(userId, newChallenge);

        await bot.sendMessage(
          chatId,
          `❌ Wrong answer. Please wait 5 seconds before trying again.\n\n` +
            `🔢 New question: What is ${newChallenge.a} + ${newChallenge.b}?`
        );
      }
    }
  } catch (err) {
    console.error("Webhook error:", err);
  }

  res.status(200).end();
};
