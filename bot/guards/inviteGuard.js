const { AuditLogEvent } = require('discord.js');
const { getConfig } = require('../utils/getConfig');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');
const { findExecutor } = require('../utils/auditLog');

function registerInviteGuard(client) {
  client.on('inviteDelete', async (invite) => {
    if (!invite.guild) return;
    const config = await getConfig(invite.guild.id);
    if (!config.inviteGuard.enabled) return;

    const executor = await findExecutor(invite.guild, AuditLogEvent.InviteDelete);
    if (!executor) return;

    const executorMember = await invite.guild.members.fetch(executor.id).catch(() => null);
    if (await isWhitelisted(config, executorMember)) return;

    // Silinen davetin yerine aynı ayarlarla yenisini oluştur (kanal biliniyorsa)
    let newInviteUrl = null;
    try {
      if (invite.channel) {
        const newInvite = await invite.channel.createInvite({
          maxAge: invite.maxAge || 0,
          maxUses: invite.maxUses || 0,
          unique: true,
          reason: 'İzinsiz silinen davet yerine otomatik oluşturuldu'
        });
        newInviteUrl = newInvite.url;
      }
    } catch (e) {
      console.error('Yeni davet oluşturma hatası:', e.message);
    }

    const action = await applyPunishment(invite.guild, executor.id, 'ban', 'İzinsiz davet silme', 10, config.banDurationDays);

    await logEvent(invite.guild, config, {
      type: 'invite_guard',
      description: `${executor.tag} davet linkini (${invite.code}) sildi.` +
        (newInviteUrl ? ` Yeni davet oluşturuldu: ${newInviteUrl}` : ' Yeni davet oluşturulamadı.'),
      moderatorId: executor.id,
      moderatorTag: executor.tag,
      actionTaken: action
    });
  });
}

module.exports = { registerInviteGuard };
