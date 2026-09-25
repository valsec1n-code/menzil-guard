const { AuditLogEvent } = require('discord.js');
const { getConfig } = require('../utils/getConfig');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');
const GuildConfig = require('../../database/models/GuildConfig');

function registerVanityGuard(client) {
  // Bot açılışında mevcut vanity kodunu kaydet (eğer daha önce kaydedilmemişse)
  client.on('ready', async () => {
    for (const guild of client.guilds.cache.values()) {
      if (!guild.vanityURLCode) continue;
      const config = await getConfig(guild.id);
      if (!config.vanityGuard.savedVanityCode) {
        await GuildConfig.updateOne(
          { guildId: guild.id },
          { 'vanityGuard.savedVanityCode': guild.vanityURLCode }
        );
      }
    }
  });

  client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.vanityURLCode === newGuild.vanityURLCode) return; // değişmemiş

    const config = await getConfig(newGuild.id);
    if (!config.vanityGuard.enabled) return;

    const savedCode = config.vanityGuard.savedVanityCode || oldGuild.vanityURLCode;
    if (!savedCode) return; // kayıtlı kod yoksa referans alacak bir şey yok

    // ⚡ ÖNCELİK: HİÇBİR ŞEY BEKLEMEDEN ANINDA GERİ AL.
    // Kod boşa çıktığı an başka biri (sniper bot) kapabilir, o yüzden
    // audit log / kim yaptı araştırması bundan SONRA yapılır.
    newGuild.edit({ vanityURLCode: savedCode }).catch(e => {
      console.error('Vanity geri alma hatası:', e.message);
    });

    // Kim yaptığını ve cezayı arka planda (geri alma işlemini bloklamadan) işle
    (async () => {
      const executor = await require('../utils/auditLog').findExecutor(newGuild, AuditLogEvent.GuildUpdate);

      let actionTaken = 'Vanity link anında eski haline döndürüldü';

      if (executor) {
        const executorMember = await newGuild.members.fetch(executor.id).catch(() => null);
        if (!(await isWhitelisted(config, executorMember))) {
          const punishResult = await applyPunishment(newGuild, executor.id, 'ban', 'Vanity URL izinsiz değiştirildi', 10, config.banDurationDays);
          actionTaken += ` + ${punishResult}`;
        }
      }

      await logEvent(newGuild, config, {
        type: 'vanity_guard',
        description: `Vanity link "${oldGuild.vanityURLCode}" -> "${newGuild.vanityURLCode}" olarak değiştirildi. Anında eski koda dönüldü.`,
        moderatorId: executor?.id,
        moderatorTag: executor?.tag,
        actionTaken
      });
    })();
  });
}

module.exports = { registerVanityGuard };
