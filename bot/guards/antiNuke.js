const { AuditLogEvent } = require('discord.js');
const { getConfig } = require('../utils/getConfig');
const { findExecutor } = require('../utils/auditLog');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');
const RateTracker = require('../utils/rateTracker');

const channelDeleteTracker = new RateTracker();
const roleDeleteTracker = new RateTracker();
const banTracker = new RateTracker();

async function handleViolation(guild, config, executorUser, reason, type) {
  if (!executorUser) return;
  const executorMember = await guild.members.fetch(executorUser.id).catch(() => null);

  if (await isWhitelisted(config, executorMember)) return; // güvenilir kişi, dokunma

  const action = await applyPunishment(
    guild,
    executorUser.id,
    config.antiNuke.punishment,
    reason
  );

  await logEvent(guild, config, {
    type,
    description: reason,
    moderatorId: executorUser.id,
    moderatorTag: executorUser.tag,
    actionTaken: action
  });
}

function registerAntiNuke(client) {
  // ---- Kanal silme ----
  client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const config = await getConfig(channel.guild.id);
    if (!config.antiNuke.enabled) return;

    const executor = await findExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    if (!executor || executor.bot === false && executor.id === client.user.id) return;

    const count = channelDeleteTracker.hit(
      `${channel.guild.id}-${executor.id}`,
      config.antiNuke.timeWindowSeconds * 1000
    );

    if (count >= config.antiNuke.channelDeleteThreshold) {
      await handleViolation(
        channel.guild, config, executor,
        `${executor.tag} kısa sürede ${count} kanal sildi (limit: ${config.antiNuke.channelDeleteThreshold})`,
        'anti_nuke_channel_delete'
      );
    }
  });

  // ---- Rol silme ----
  client.on('roleDelete', async (role) => {
    const config = await getConfig(role.guild.id);
    if (!config.antiNuke.enabled) return;

    const executor = await findExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
    if (!executor) return;

    const count = roleDeleteTracker.hit(
      `${role.guild.id}-${executor.id}`,
      config.antiNuke.timeWindowSeconds * 1000
    );

    if (count >= config.antiNuke.roleDeleteThreshold) {
      await handleViolation(
        role.guild, config, executor,
        `${executor.tag} kısa sürede ${count} rol sildi (limit: ${config.antiNuke.roleDeleteThreshold})`,
        'anti_nuke_role_delete'
      );
    }
  });

  // ---- Toplu ban ----
  client.on('guildBanAdd', async (ban) => {
    const config = await getConfig(ban.guild.id);
    if (!config.antiNuke.enabled) return;

    const executor = await findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    if (!executor) return;

    const count = banTracker.hit(
      `${ban.guild.id}-${executor.id}`,
      config.antiNuke.timeWindowSeconds * 1000
    );

    if (count >= config.antiNuke.banThreshold) {
      await handleViolation(
        ban.guild, config, executor,
        `${executor.tag} kısa sürede ${count} kişi banladı (limit: ${config.antiNuke.banThreshold})`,
        'anti_nuke_mass_ban'
      );
    }
  });

  // ---- İzinsiz rol/izin değişikliği (örn. @everyone'a admin verme) ----
  client.on('roleUpdate', async (oldRole, newRole) => {
    const config = await getConfig(newRole.guild.id);
    if (!config.antiNuke.enabled) return;

    const gainedAdmin = !oldRole.permissions.has('Administrator') && newRole.permissions.has('Administrator');
    if (!gainedAdmin) return;

    const executor = await findExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
    if (!executor) return;

    const executorMember = await newRole.guild.members.fetch(executor.id).catch(() => null);
    if (await isWhitelisted(config, executorMember)) return;

    // Yetkiyi hemen geri al
    await newRole.setPermissions(oldRole.permissions, 'Anti-nuke: izinsiz admin yetkisi geri alındı');

    await handleViolation(
      newRole.guild, config, executor,
      `${executor.tag}, "${newRole.name}" rolüne izinsiz Administrator yetkisi verdi. Yetki geri alındı.`,
      'anti_nuke_permission_change'
    );
  });
}

module.exports = { registerAntiNuke };
