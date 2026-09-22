const { getConfig } = require('../utils/getConfig');
const { logEvent } = require('../utils/punish');

function registerAccountAgeGuard(client) {
  client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;

    const config = await getConfig(member.guild.id);
    if (!config.accountAgeGuard.enabled) return;

    const accountAgeMs = Date.now() - member.user.createdTimestamp;
    const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);

    if (accountAgeDays >= config.accountAgeGuard.minDays) return; // yeterince eski, sorun yok

    let actionTaken = '';
    try {
      if (config.accountAgeGuard.action === 'kick') {
        await member.kick('Hesap yaşı çok yeni');
        actionTaken = 'kick';
      } else if (config.accountAgeGuard.action === 'ban') {
        await member.ban({ reason: 'Hesap yaşı çok yeni' });
        actionTaken = 'ban';
      } else if (config.accountAgeGuard.action === 'quarantine' && config.accountAgeGuard.quarantineRoleId) {
        await member.roles.add(config.accountAgeGuard.quarantineRoleId, 'Hesap yaşı çok yeni - karantina');
        actionTaken = 'karantina rolü verildi';
      }
    } catch (e) {
      actionTaken = 'hata: ' + e.message;
    }

    await logEvent(member.guild, config, {
      type: 'account_age_guard',
      description: `${member.user.tag} adlı kullanıcının hesabı ${accountAgeDays.toFixed(1)} günlük (limit: ${config.accountAgeGuard.minDays} gün)`,
      moderatorId: member.id,
      moderatorTag: member.user.tag,
      actionTaken
    });
  });
}

module.exports = { registerAccountAgeGuard };
