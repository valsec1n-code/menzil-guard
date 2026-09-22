const { AuditLogEvent } = require('discord.js');
const { getConfig } = require('../utils/getConfig');
const { findExecutor } = require('../utils/auditLog');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');
const RateTracker = require('../utils/rateTracker');

const channelDeleteTracker = new RateTracker();
const channelCreateTracker = new RateTracker();
const roleDeleteTracker = new RateTracker();
const roleCreateTracker = new RateTracker();
const banTracker = new RateTracker();

async function punishIfNotWhitelisted(guild, config, executorUser, punishment, reason, type) {
  if (!executorUser) return;
  const executorMember = await guild.members.fetch(executorUser.id).catch(() => null);
  if (await isWhitelisted(config, executorMember)) return;

  const action = await applyPunishment(guild, executorUser.id, punishment, reason, 10, config.banDurationDays);

  await logEvent(guild, config, {
    type,
    description: reason,
    moderatorId: executorUser.id,
    moderatorTag: executorUser.tag,
    actionTaken: action
  });
}

function registerAntiNuke(client) {
  // ---- KANAL SİLME ----
  client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const config = await getConfig(channel.guild.id);
    if (!config.channelGuard.deleteEnabled) return;

    const executor = await findExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    if (!executor) return;

    const count = channelDeleteTracker.hit(`${channel.guild.id}-${executor.id}`, config.channelGuard.deleteWindowSeconds * 1000);
    if (count >= config.channelGuard.deleteThreshold) {
      await punishIfNotWhitelisted(
        channel.guild, config, executor, config.channelGuard.deletePunishment,
        `${executor.tag} kısa sürede ${count} kanal sildi (limit: ${config.channelGuard.deleteThreshold})`,
        'channel_delete_guard'
      );
    }
  });

  // ---- KANAL AÇMA ----
  client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const config = await getConfig(channel.guild.id);
    if (!config.channelGuard.createEnabled) return;

    const executor = await findExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    if (!executor) return;

    const count = channelCreateTracker.hit(`${channel.guild.id}-${executor.id}`, config.channelGuard.createWindowSeconds * 1000);
    if (count >= config.channelGuard.createThreshold) {
      await punishIfNotWhitelisted(
        channel.guild, config, executor, config.channelGuard.createPunishment,
        `${executor.tag} kısa sürede ${count} kanal açtı (limit: ${config.channelGuard.createThreshold})`,
        'channel_create_guard'
      );
    }
  });

  // ---- ROL SİLME ----
  client.on('roleDelete', async (role) => {
    const config = await getConfig(role.guild.id);
    if (!config.roleGuard.deleteEnabled) return;

    const executor = await findExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
    if (!executor) return;

    const count = roleDeleteTracker.hit(`${role.guild.id}-${executor.id}`, config.roleGuard.deleteWindowSeconds * 1000);
    if (count >= config.roleGuard.deleteThreshold) {
      await punishIfNotWhitelisted(
        role.guild, config, executor, config.roleGuard.deletePunishment,
        `${executor.tag} kısa sürede ${count} rol sildi (limit: ${config.roleGuard.deleteThreshold})`,
        'role_delete_guard'
      );
    }
  });

  // ---- ROL AÇMA ----
  client.on('roleCreate', async (role) => {
    const config = await getConfig(role.guild.id);
    if (!config.roleGuard.createEnabled) return;

    const executor = await findExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
    if (!executor) return;

    const count = roleCreateTracker.hit(`${role.guild.id}-${executor.id}`, config.roleGuard.createWindowSeconds * 1000);
    if (count >= config.roleGuard.createThreshold) {
      await punishIfNotWhitelisted(
        role.guild, config, executor, config.roleGuard.createPunishment,
        `${executor.tag} kısa sürede ${count} rol açtı (limit: ${config.roleGuard.createThreshold})`,
        'role_create_guard'
      );
    }
  });

  // ---- TOPLU BAN ----
  client.on('guildBanAdd', async (ban) => {
    const config = await getConfig(ban.guild.id);
    if (!config.banGuard.enabled) return;

    const executor = await findExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    if (!executor) return;

    const count = banTracker.hit(`${ban.guild.id}-${executor.id}`, config.banGuard.windowSeconds * 1000);
    if (count >= config.banGuard.threshold) {
      await punishIfNotWhitelisted(
        ban.guild, config, executor, config.banGuard.punishment,
        `${executor.tag} kısa sürede ${count} kişi banladı (limit: ${config.banGuard.threshold})`,
        'ban_guard'
      );
    }
  });

  // ---- İZİNSİZ YETKİ DEĞİŞİKLİĞİ ----
  client.on('roleUpdate', async (oldRole, newRole) => {
    const config = await getConfig(newRole.guild.id);
    if (!config.permissionGuard.enabled) return;

    const gainedAdmin = !oldRole.permissions.has('Administrator') && newRole.permissions.has('Administrator');
    if (!gainedAdmin) return;

    const executor = await findExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
    if (!executor) return;

    const executorMember = await newRole.guild.members.fetch(executor.id).catch(() => null);
    if (await isWhitelisted(config, executorMember)) return;

    await newRole.setPermissions(oldRole.permissions, 'İzinsiz admin yetkisi geri alındı').catch(() => {});

    await punishIfNotWhitelisted(
      newRole.guild, config, executor, config.permissionGuard.punishment,
      `${executor.tag}, "${newRole.name}" rolüne izinsiz Administrator yetkisi verdi. Yetki geri alındı.`,
      'permission_guard'
    );
  });
}

module.exports = { registerAntiNuke };
