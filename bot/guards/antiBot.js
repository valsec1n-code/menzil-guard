const { getConfig } = require('../utils/getConfig');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');

function registerAntiBot(client) {
  client.on('guildMemberAdd', async (member) => {
    if (!member.user.bot) return; // sadece botları kontrol et

    const config = await getConfig(member.guild.id);
    if (!config.antiBot.enabled) return;

    // Whitelist'teki bot ID'leri muaf (örn. bilinen/güvenilir botlar)
    if (await isWhitelisted(config, member)) return;

    const action = await applyPunishment(member.guild, member.id, config.antiBot.punishment, 'Anti-bot: izinsiz bot girişi', 10, config.banDurationDays);

    await logEvent(member.guild, config, {
      type: 'anti_bot',
      description: `İzinsiz bir bot (${member.user.tag}) sunucuya eklenmeye çalıştı.`,
      moderatorId: member.id,
      moderatorTag: member.user.tag,
      actionTaken: action
    });
  });
}

module.exports = { registerAntiBot };
