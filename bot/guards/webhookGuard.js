const { AuditLogEvent } = require('discord.js');
const { getConfig } = require('../utils/getConfig');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');
const { findExecutor } = require('../utils/auditLog');

function registerWebhookGuard(client) {
  client.on('webhooksUpdate', async (channel) => {
    const config = await getConfig(channel.guild.id);
    if (!config.webhookGuard.enabled) return;

    const executor = await findExecutor(channel.guild, AuditLogEvent.WebhookCreate);
    if (!executor) return;

    const executorMember = await channel.guild.members.fetch(executor.id).catch(() => null);
    if (await isWhitelisted(config, executorMember)) return;

    // Kanaldaki izinsiz webhook'ları temizle
    try {
      const webhooks = await channel.fetchWebhooks();
      for (const wh of webhooks.values()) {
        if (wh.owner?.id === executor.id) await wh.delete('Guard: izinsiz webhook').catch(() => {});
      }
    } catch (e) {
      console.error('Webhook temizleme hatası:', e.message);
    }

    const action = await applyPunishment(channel.guild, executor.id, config.webhookGuard.punishment, 'İzinsiz webhook oluşturma');

    await logEvent(channel.guild, config, {
      type: 'webhook_guard',
      description: `${executor.tag}, #${channel.name} kanalında izinsiz webhook oluşturdu. Webhook silindi.`,
      moderatorId: executor.id,
      moderatorTag: executor.tag,
      actionTaken: action
    });
  });
}

module.exports = { registerWebhookGuard };
