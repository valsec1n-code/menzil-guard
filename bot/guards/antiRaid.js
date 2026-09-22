const { getConfig } = require('../utils/getConfig');
const { logEvent } = require('../utils/punish');
const RateTracker = require('../utils/rateTracker');

const joinTracker = new RateTracker();
const lockedGuilds = new Set();

function registerAntiRaid(client) {
  client.on('guildMemberAdd', async (member) => {
    const config = await getConfig(member.guild.id);
    if (!config.antiRaid.enabled) return;

    // Zaten kilit modundaysa yeni gelen şüpheli üyeleri direkt at
    if (lockedGuilds.has(member.guild.id)) {
      await member.kick('Anti-raid: sunucu kilit modunda').catch(() => {});
      return;
    }

    const count = joinTracker.hit(member.guild.id, config.antiRaid.timeWindowSeconds * 1000);

    if (count >= config.antiRaid.joinThreshold) {
      lockedGuilds.add(member.guild.id);

      let actionDesc = '';
      if (config.antiRaid.action === 'lockdown') {
        // Sunucuyu geçici kilitle: @everyone'ın kanal görme/mesaj yetkisini kapat
        try {
          const everyoneRole = member.guild.roles.everyone;
          await everyoneRole.setPermissions(
            everyoneRole.permissions.remove(['SendMessages']),
            'Anti-raid: otomatik kilit'
          );
          actionDesc = 'Sunucu kilitlendi (mesaj gönderimi kapatıldı)';
        } catch (e) {
          actionDesc = 'Kilitleme başarısız: ' + e.message;
        }
      } else if (config.antiRaid.action === 'kick_new') {
        actionDesc = 'Yeni gelen şüpheli üyeler otomatik atılacak';
      } else {
        actionDesc = 'Sadece owner bilgilendirildi';
      }

      await logEvent(member.guild, config, {
        type: 'anti_raid',
        description: `⚠️ RAID TESPİT EDİLDİ: ${config.antiRaid.timeWindowSeconds} saniyede ${count} üye katıldı!`,
        actionTaken: actionDesc
      });

      // 2 dakika sonra kilidi otomatik kaldır (owner dashboard'dan da manuel kaldırabilir)
      setTimeout(() => lockedGuilds.delete(member.guild.id), 2 * 60 * 1000);
    }
  });
}

module.exports = { registerAntiRaid, lockedGuilds };
