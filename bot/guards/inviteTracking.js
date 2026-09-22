const InviteStat = require('../../database/models/InviteStat');

// guildId -> Map(inviteCode -> uses)
const inviteCache = new Map();

async function cacheGuildInvites(guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map();
    invites.forEach(inv => map.set(inv.code, { uses: inv.uses, inviterId: inv.inviter?.id, inviterTag: inv.inviter?.tag }));
    inviteCache.set(guild.id, map);
  } catch (e) {
    // Bot'un "Manage Server" yetkisi yoksa davet listesi çekilemez, sessizce geç
  }
}

function registerInviteTracking(client) {
  client.on('ready', async () => {
    for (const guild of client.guilds.cache.values()) {
      await cacheGuildInvites(guild);
    }
  });

  client.on('inviteCreate', async (invite) => {
    const map = inviteCache.get(invite.guild.id) || new Map();
    map.set(invite.code, { uses: invite.uses || 0, inviterId: invite.inviter?.id, inviterTag: invite.inviter?.tag });
    inviteCache.set(invite.guild.id, map);
  });

  client.on('inviteDelete', async (invite) => {
    const map = inviteCache.get(invite.guild.id);
    if (map) map.delete(invite.code);
  });

  client.on('guildMemberAdd', async (member) => {
    const before = inviteCache.get(member.guild.id);
    await cacheGuildInvites(member.guild); // yeni durumu çek
    const after = inviteCache.get(member.guild.id);

    if (!before || !after) return;

    // Hangi davetin kullanım sayısı arttıysa, kullanılan davet odur
    for (const [code, afterData] of after.entries()) {
      const beforeData = before.get(code);
      const beforeUses = beforeData ? beforeData.uses : 0;

      if (afterData.uses > beforeUses && afterData.inviterId) {
        await InviteStat.findOneAndUpdate(
          { guildId: member.guild.id, inviterId: afterData.inviterId },
          { $inc: { uses: 1 }, $set: { inviterTag: afterData.inviterTag || 'Bilinmiyor' } },
          { upsert: true }
        );
        break;
      }
    }
  });
}

module.exports = { registerInviteTracking };
