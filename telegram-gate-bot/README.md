# 🤖 Telegram Gate Bot

A Telegram bot that guards access to your private channel behind a simple human verification (random addition). Each user who passes gets a **unique, single-use invite link** — no two users share the same link.

Runs 24/7 for free on **Vercel** using webhook mode (no server polling).

---

## How it works

```
User sends /start
  → Bot sends a random addition question (e.g. "What is 7 + 13?")
  → User replies with the answer
    ✅ Correct → Bot generates a unique single-use invite link → sends it
    ❌ Wrong   → Bot sends a new question
```

---

## Setup (10 minutes)

### 1. Create your Telegram bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` and follow the prompts
3. Copy your **bot token** (looks like `123456789:ABCDef...`)

### 2. Make your bot an admin of your channel

1. Open your **private channel** settings → Administrators → Add Administrator
2. Search for your bot's username and add it
3. Make sure **"Invite users via link"** permission is enabled ✅

### 3. Get your channel ID

Forward any message from your channel to [@userinfobot](https://t.me/userinfobot).  
It will show something like `Chat ID: -1001234567890` — copy that number.

### 4. Deploy to Vercel

```bash
# Clone / download this project
cd telegram-gate-bot

# Install dependencies
npm install

# Deploy to Vercel (install Vercel CLI first: npm i -g vercel)
vercel

# Set environment variables in Vercel dashboard or via CLI:
vercel env add TELEGRAM_BOT_TOKEN
vercel env add TELEGRAM_CHANNEL_ID

# Redeploy so env vars take effect
vercel --prod
```

### 5. Register the webhook

After deploying, run this once to tell Telegram where to send updates:

```bash
TELEGRAM_BOT_TOKEN=your_token \
VERCEL_URL=https://your-app.vercel.app \
node scripts/set-webhook.js
```

You should see: `✅ Webhook set to: https://your-app.vercel.app/webhook`

**That's it!** Your bot is live 24/7.

---

## Local development

```bash
cp .env.example .env
# Fill in your token and channel ID in .env

npm run dev
```

This uses polling instead of a webhook — no deployment needed for testing.

---

## Optional: Persistent storage with Upstash Redis

By default the bot uses in-memory storage. This means if Vercel cold-starts a new instance, a user mid-challenge will need to `/start` again (rare but possible).

To make it fully persistent:

1. Create a free account at [upstash.com](https://upstash.com)
2. Create a Redis database → copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Add them to your Vercel environment variables
4. Replace `lib/store.js` with the Redis version below:

```js
// lib/store.js (Redis version)
const { Redis } = require("@upstash/redis");
const redis = Redis.fromEnv();

async function getPendingChallenge(userId) {
  return redis.get(`challenge:${userId}`);
}
async function setPendingChallenge(userId, challenge) {
  await redis.set(`challenge:${userId}`, challenge, { ex: 3600 }); // 1h TTL
}
async function deletePendingChallenge(userId) {
  await redis.del(`challenge:${userId}`);
}
async function generateInviteLink(bot) { /* same as before */ }
module.exports = { getPendingChallenge, setPendingChallenge, deletePendingChallenge, generateInviteLink };
```

Then `npm install @upstash/redis`.

---

## File structure

```
telegram-gate-bot/
├── api/
│   └── webhook.js        ← Vercel serverless function (the bot brain)
├── lib/
│   └── store.js          ← In-memory state + invite link generator
├── scripts/
│   ├── set-webhook.js    ← Run once after deploying
│   └── dev.js            ← Local polling server
├── .env.example
├── package.json
└── vercel.json
```

---

## Customization ideas

| What | Where |
|---|---|
| Change question type (multiplication, trivia…) | `api/webhook.js` → `randomAddition()` |
| Set link expiry date | `lib/store.js` → add `expire_date` to `createChatInviteLink` |
| Rate-limit users | `lib/store.js` → track attempt timestamps |
| Welcome message text | `api/webhook.js` → `/start` handler |
