const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
} = require("discord.js");
const axios = require("axios");
const fs = require("fs");

/* ================= CONFIG ================= */
const TOKEN = process.env.TOKEN; // ✅ التوكن آمن
const TIME_LIMIT = 20 * 1000;
/* ========================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/* ================= DATA ================= */
let characters = [];
let currentGame = null;
const scores = new Map();

/* ================= UTILS ================= */

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\u0600-\u06FF\s]/g, "")
    .trim();
}

function fixName(name) {
  if (name.includes(",")) {
    const [a, b] = name.split(",").map(x => x.trim());
    return `${b} ${a}`;
  }
  return name;
}

function toArabic(name) {
  return name
    .toLowerCase()
    .replace(/shi/g, "شي")
    .replace(/chi/g, "تشي")
    .replace(/tsu/g, "تسو")
    .replace(/sa/g, "سا")
    .replace(/su/g, "سو")
    .replace(/ke/g, "كي")
    .replace(/ka/g, "كا")
    .replace(/ku/g, "كو")
    .replace(/na/g, "نا")
    .replace(/no/g, "نو")
    .replace(/ma/g, "ما")
    .replace(/mi/g, "مي")
    .replace(/ya/g, "يا")
    .replace(/ra/g, "را")
    .replace(/ri/g, "ري")
    .replace(/ru/g, "رو")
    .replace(/a/g, "ا")
    .replace(/i/g, "ي")
    .replace(/u/g, "و")
    .replace(/e/g, "ي")
    .replace(/o/g, "و")
    .replace(/[a-z]/g, "");
}

function validImage(url) {
  return typeof url === "string" && url.startsWith("http");
}

/* ================= LOAD CHARACTERS ================= */

async function loadCharacters() {
  const animeIds = [
    20,
    1735,
    269,
    813,
    16498,
    40748,
    38000,
  ];

  for (const id of animeIds) {
    try {
      const res = await axios.get(
        `https://api.jikan.moe/v4/anime/${id}/characters`
      );

      for (const c of res.data.data) {
        if (!c.character?.images?.jpg?.image_url) continue;

        const en = fixName(c.character.name);
        const ar = toArabic(en);

        characters.push({
          en,
          ar,
          image: c.character.images.jpg.image_url,
          accepts: [
            normalize(en),
            normalize(ar),
            ...normalize(en).split(" "),
            ...normalize(ar).split(" "),
          ],
        });
      }

      await new Promise(r => setTimeout(r, 800));
    } catch {
      console.log("⚠️ تخطي أنمي");
    }
  }

  console.log(`✅ Loaded ${characters.length} characters`);
}

/* ================= GAME ================= */

client.on("messageCreate", async message => {
  if (message.author.bot) return;

  if (message.content === "!guess" && !currentGame) {
    const pick = characters[Math.floor(Math.random() * characters.length)];
    currentGame = { ...pick, ended: false };

    const embed = new EmbedBuilder()
      .setTitle("🎯 من هذه الشخصية؟")
      .setDescription("⏳ 20 ثانية")
      .setColor("Random");

    if (validImage(pick.image)) embed.setImage(pick.image);

    const gameMsg = await message.channel.send({ embeds: [embed] });

    setTimeout(() => {
      if (!currentGame || currentGame.ended) return;

      embed.setDescription(`⏰ انتهى الوقت\n✅ الإجابة: **${pick.ar}**`);
      gameMsg.edit({ embeds: [embed] });
      currentGame = null;
    }, TIME_LIMIT);

    return;
  }

  if (currentGame && !currentGame.ended) {
    const msg = normalize(message.content);

    if (currentGame.accepts.some(a => msg.includes(a))) {
      currentGame.ended = true;

      const score = (scores.get(message.author.id) || 0) + 1;
      scores.set(message.author.id, score);

      await message.react("✅");

      const win = new EmbedBuilder()
        .setTitle("✅ إجابة صحيحة")
        .setDescription(
          `🏆 الفائز: ${message.author}\n✨ الاسم: **${currentGame.ar}**\n⭐ نقاطك: ${score}`
        )
        .setImage(currentGame.image);

      await message.channel.send({ embeds: [win] });
      currentGame = null;
    } else {
      message.react("❌").catch(() => {});
    }
  }
});

/* ================= READY ================= */

client.once("ready", async () => {
  console.log(`✅ Logged as ${client.user.tag}`);
  await loadCharacters();
});

/* ================= LOGIN ================= */
client.login(TOKEN);

