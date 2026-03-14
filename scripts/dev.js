/**
 * Local dev server using long-polling (no webhook needed locally).
 * Usage:
 *   TELEGRAM_BOT_TOKEN=xxx TELEGRAM_CHANNEL_ID=xxx node scripts/dev.js
 */

// Monkey-patch env before requiring the handler
process.env.NODE_ENV = "development";

const TelegramBot = require("node-telegram-bot-api");
const {
  generateInviteLink,
  getPendingChallenge,
  setPendingChallenge,
  deletePendingChallenge,
} = require("../lib/store");

function randomAddition() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  return { a, b, answer: a + b };
}

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
console.log("🤖  Bot started in polling mode (local dev)...");

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const firstName = msg.from.first_name || "there";

  const challenge = randomAddition();
  setPendingChallenge(userId, challenge);

  await bot.sendMessage(
    chatId,
    `👋 Hey ${firstName}! To get access to the private channel, please solve this quick verification:\n\n` +
      `🔢 What is ${challenge.a} + ${challenge.b}?\n\nJust reply with the number.`
  );
});

bot.on("message", async (msg) => {
  if (msg.text?.startsWith("/")) return;

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text?.trim();
  if (!text) return;

  const challenge = getPendingChallenge(userId);
  if (!challenge) {
    return bot.sendMessage(chatId, "Please use /start to begin the verification.");
  }

  const userAnswer = parseInt(text, 10);
  if (isNaN(userAnswer)) {
    return bot.sendMessage(chatId, "⚠️ Please enter a number only.");
  }

  if (userAnswer === challenge.answer) {
    deletePendingChallenge(userId);
    try {
      const inviteLink = await generateInviteLink(bot);
      await bot.sendMessage(
        chatId,
        `✅ Correct! Welcome aboard!\n\nHere is your private access link (valid for 1 use only):\n\n🔗 ${inviteLink}\n\n_This link is unique to you — do not share it._`
      );
    } catch (err) {
      console.error("Failed to create invite link:", err.message);
      await bot.sendMessage(chatId, "✅ Correct! But I failed to generate your link. Please contact the admin.");
    }
  } else {
    const newChallenge = randomAddition();
    setPendingChallenge(userId, newChallenge);
    await bot.sendMessage(
      chatId,
      `❌ Wrong answer. Let's try again!\n\n🔢 What is ${newChallenge.a} + ${newChallenge.b}?`
    );
  }
});
