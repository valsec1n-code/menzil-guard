const { getConfig } = require('../utils/getConfig');
const { isWhitelisted, applyPunishment, logEvent } = require('../utils/punish');
const RateTracker = require('../utils/rateTracker');

const messageTracker = new RateTracker();

function registerAntiSpam(client) {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const config = await getConfig(message.guild.id);
    if (!config.antiSpam.enabled) return;

    const member = message.member;
    if (await isWhitelisted(config, member)) return;

    // Aşırı mention kontrolü (tek mesajda)
    if (message.mentions.users.size + message.mentions.roles.size >= config.antiSpam.mentionLimit) {
      await message.delete().catch(() => {});
      const action = await applyPunishment(
        message.guild, message.author.id, config.antiSpam.punishment,
        'Anti-spam: aşırı mention', config.antiSpam.muteDurationMinutes
      );
      await logEvent(message.guild, config, {
        type: 'anti_spam_mention',
        description: `${message.author.tag} bir mesajda ${message.mentions.users.size + message.mentions.roles.size} mention kullandı`,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        actionTaken: action
      });
      return;
    }

    // Mesaj flood kontrolü
    const count = messageTracker.hit(
      `${message.guild.id}-${message.author.id}`,
      config.antiSpam.timeWindowSeconds * 1000
    );

    if (count >= config.antiSpam.messageThreshold) {
      const action = await applyPunishment(
        message.guild, message.author.id, config.antiSpam.punishment,
        'Anti-spam: mesaj flood', config.antiSpam.muteDurationMinutes
      );
      await logEvent(message.guild, config, {
        type: 'anti_spam_flood',
        description: `${message.author.tag} ${config.antiSpam.timeWindowSeconds} saniyede ${count} mesaj attı`,
        moderatorId: message.author.id,
        moderatorTag: message.author.tag,
        actionTaken: action
      });
    }
  });
}

module.exports = { registerAntiSpam };
