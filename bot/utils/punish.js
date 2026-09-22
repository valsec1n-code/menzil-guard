const LogEntry = require('../../database/models/LogEntry');

/**
 * Bir kullanıcının whitelist'te olup olmadığını kontrol eder
 * (ID whitelist'te mi veya whitelist rollerinden birine sahip mi)
 */
async function isWhitelisted(config, member) {
  if (!member) return false;
  if (config.whitelistUsers.includes(member.id)) return true;
  if (member.guild.ownerId === member.id) return true; // sunucu sahibi her zaman muaf
  if (member.roles?.cache) {
    for (const roleId of config.whitelistRoles) {
      if (member.roles.cache.has(roleId)) return true;
    }
  }
  return false;
}

/**
 * Belirtilen cezayı uygular: 'kick' | 'ban' | 'strip_roles' | 'mute'
 */
async function applyPunishment(guild, userId, punishmentType, reason, muteDurationMinutes = 10) {
  try {
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return `Kullanıcı sunucuda bulunamadı (${userId})`;

    switch (punishmentType) {
      case 'ban':
        await guild.members.ban(userId, { reason });
        return 'ban';

      case 'kick':
        await member.kick(reason);
        return 'kick';

      case 'strip_roles': {
        const rolesToRemove = member.roles.cache.filter(r => r.id !== guild.id);
        await member.roles.remove(rolesToRemove, reason);
        return 'roller alındı';
      }

      case 'mute': {
        const durationMs = muteDurationMinutes * 60 * 1000;
        await member.timeout(durationMs, reason);
        return `${muteDurationMinutes} dakika susturuldu`;
      }

      default:
        return 'bilinmeyen ceza türü';
    }
  } catch (err) {
    console.error('Ceza uygulama hatası:', err.message);
    return `hata: ${err.message}`;
  }
}

/**
 * Log kanalına mesaj gönderir + DB'ye kaydeder
 */
async function logEvent(guild, config, { type, description, moderatorId, moderatorTag, targetId, actionTaken }) {
  await LogEntry.addLog({ guildId: guild.id, type, description, moderatorId, moderatorTag, targetId, actionTaken });

  if (!config.logChannelId) return;
  const channel = guild.channels.cache.get(config.logChannelId);
  if (!channel) return;

  const embed = {
    color: 0xE74C3C,
    title: `🛡️ Guard Uyarısı: ${type}`,
    description,
    fields: [
      { name: 'Kişi', value: moderatorTag || 'Bilinmiyor', inline: true },
      { name: 'Uygulanan Ceza', value: actionTaken || 'Yok', inline: true }
    ],
    timestamp: new Date()
  };

  channel.send({ embeds: [embed] }).catch(() => {});

  if (config.dmOwnerOnCritical && config.ownerDiscordId) {
    guild.client.users.fetch(config.ownerDiscordId)
      .then(u => u.send({ embeds: [embed] }).catch(() => {}))
      .catch(() => {});
  }
}

module.exports = { isWhitelisted, applyPunishment, logEvent };
