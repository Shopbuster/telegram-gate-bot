/**
 * store.js
 *
 * In-memory store for pending challenges and cooldowns.
 */

const pendingChallenges = new Map(); // userId → { a, b, answer }
const cooldowns = new Map();         // userId → timestamp of last wrong answer

const COOLDOWN_MS = 5000; // 5 seconds

// ── challenges ────────────────────────────────────────────────────────────────

function getPendingChallenge(userId) {
  return pendingChallenges.get(String(userId)) || null;
}

function setPendingChallenge(userId, challenge) {
  pendingChallenges.set(String(userId), challenge);
}

function deletePendingChallenge(userId) {
  pendingChallenges.delete(String(userId));
}

// ── cooldown ──────────────────────────────────────────────────────────────────

/**
 * Returns how many milliseconds remain on the cooldown, or 0 if none.
 */
function getCooldownRemaining(userId) {
  const ts = cooldowns.get(String(userId));
  if (!ts) return 0;
  const elapsed = Date.now() - ts;
  return elapsed < COOLDOWN_MS ? COOLDOWN_MS - elapsed : 0;
}

function setCooldown(userId) {
  cooldowns.set(String(userId), Date.now());
}

// ── invite links ──────────────────────────────────────────────────────────────

async function createLink(bot, channelId) {
  if (!channelId) throw new Error("Channel ID is not set.");
  const numericId = Number(channelId);
  if (isNaN(numericId)) throw new Error(`Channel ID "${channelId}" is not a valid number.`);
  const result = await bot.createChatInviteLink(numericId, {
    member_limit: 1,
    creates_join_request: false,
  });
  return result.invite_link;
}

/**
 * Generates one single-use invite link per configured channel.
 * Returns [link1, link2] — link2 is null if TELEGRAM_CHANNEL_ID_2 is not set.
 */
async function generateInviteLinks(bot) {
  const id1 = process.env.TELEGRAM_CHANNEL_ID;
  const id2 = process.env.TELEGRAM_CHANNEL_ID_2;

  if (!id1) throw new Error("TELEGRAM_CHANNEL_ID environment variable is not set.");

  const link1 = await createLink(bot, id1);
  const link2 = id2 ? await createLink(bot, id2) : null;

  return [link1, link2];
}

module.exports = {
  getPendingChallenge,
  setPendingChallenge,
  deletePendingChallenge,
  getCooldownRemaining,
  setCooldown,
  generateInviteLinks,
};
