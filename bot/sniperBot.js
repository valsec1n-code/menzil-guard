const { Client, GatewayIntentBits } = require('discord.js');
const VanitySniper = require('../database/models/VanitySniper');

const POLL_INTERVAL_MS = 2000; // her 2 saniyede bir kontrol

function startSniperBot(token) {
  const sniperClient = new Client({ intents: [GatewayIntentBits.Guilds] });

  sniperClient.once('ready', () => {
    console.log(`🎯 Sniper bot giriş yaptı: ${sniperClient.user.tag}`);
    setInterval(() => checkAllTargets(sniperClient), POLL_INTERVAL_MS);
  });

  sniperClient.login(token).catch(err => {
    console.error('❌ Sniper bot giriş hatası:', err.message);
  });

  return sniperClient;
}

async function checkAllTargets(sniperClient) {
  const targets = await VanitySniper.find({ enabled: true });

  for (const target of targets) {
    try {
      await checkOneTarget(sniperClient, target);
    } catch (e) {
      // Tek bir hedefteki hata diğerlerini etkilemesin
      console.error(`Sniper kontrol hatası (${target.watchedCode}):`, e.message);
    }
  }
}

async function checkOneTarget(sniperClient, target) {
  const targetGuild = sniperClient.guilds.cache.get(target.targetGuildId);

  if (!targetGuild) {
    target.lastStatus = '⚠️ Bot hedef sunucuda değil';
    target.lastCheckedAt = new Date();
    await target.save();
    return;
  }

  // Zaten hedef sunucuda mı, kontrol et
  target.targetGuildName = targetGuild.name;
  if (targetGuild.vanityURLCode === target.watchedCode) {
    target.lastStatus = '✅ Kod zaten sende duruyor';
    target.lastCheckedAt = new Date();
    await target.save();
    return;
  }

  // Kod şu an kimde, öğrenmeye çalış
  let currentOwnerGuildId = null;
  let codeIsFree = false;

  try {
    const invite = await sniperClient.fetchInvite(target.watchedCode);
    currentOwnerGuildId = invite.guild?.id || null;
  } catch (e) {
    // Kod hiçbir yerde kullanılmıyor / geçersiz = BOŞA ÇIKMIŞ OLABİLİR
    codeIsFree = true;
  }

  if (currentOwnerGuildId && currentOwnerGuildId !== target.targetGuildId) {
    target.lastStatus = `🔒 Hâlâ başka bir sunucuda (ID: ${currentOwnerGuildId})`;
    target.lastCheckedAt = new Date();
    await target.save();
    return;
  }

  if (codeIsFree) {
    // ⚡ KOD BOŞA ÇIKMIŞ - HİÇBİR ŞEY BEKLEMEDEN ANINDA KAP
    try {
      await targetGuild.edit({ vanityURLCode: target.watchedCode });
      target.lastStatus = `🎯 KAPILDI! Kod şimdi bu sunucuda.`;
      console.log(`🎯 SNIPE BAŞARILI: "${target.watchedCode}" -> ${targetGuild.name}`);
    } catch (e) {
      target.lastStatus = `❌ Kapma denemesi başarısız: ${e.message}`;
    }
  }

  target.lastCheckedAt = new Date();
  await target.save();
}

module.exports = { startSniperBot };
