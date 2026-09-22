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

    const executor = await require('../utils/auditLog').findExecutor(newGuild, AuditLogEvent.GuildUpdate);

    // Eski vanity koduna geri dön
    try {
      await newGuild.edit({ vanityURLCode: savedCode });
    } catch (e) {
      console.error('Vanity geri alma hatası:', e.message);
    }

    let actionTaken = 'Vanity link eski haline döndürüldü';

    if (executor) {
      const executorMember = await newGuild.members.fetch(executor.id).catch(() => null);
      if (!(await isWhitelisted(config, executorMember))) {
        const punishResult = await applyPunishment(newGuild, executor.id, 'ban', 'Vanity URL izinsiz değiştirildi');
        actionTaken += ` + ${punishResult}`;
      }
    }

    await logEvent(newGuild, config, {
      type: 'vanity_guard',
      description: `Vanity link "${oldGuild.vanityURLCode}" -> "${newGuild.vanityURLCode}" olarak değiştirildi. Eski koda geri dönüldü.`,
      moderatorId: executor?.id,
      moderatorTag: executor?.tag,
      actionTaken
    });
  });
}

module.exports = { registerVanityGuard };
